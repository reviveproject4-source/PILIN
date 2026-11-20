// Bluetooth Printer Domain Service (ESC/POS Web Bluetooth API)
// Compatible with 58mm & 80mm Bluetooth Thermal POS Printers (Panda, RPP02N, Goojprt, Zjiang, VSC, Eppos, etc.)

export interface PrintableTransaction {
  id: string;
  customer: string;
  phone: string;
  service: string;
  qty: number;
  pricing_unit?: string;
  price: number;
  total: number;
  payment_type?: 'LUNAS' | 'DP';
  dp_amount?: number;
  remaining_amount?: number;
  method: 'CASH' | 'QRIS_TRANSFER';
  status: string;
  time: string;
  estimatedCompletion?: string;
  items?: Array<{
    id?: string;
    service: string;
    qty: number;
    pricing_unit?: string;
    price: number;
    subtotal: number;
  }>;
}

export interface BusinessStoreInfo {
  business_name: string;
  business_address?: string;
  business_phone?: string;
  terms_and_conditions?: string;
}

// Common Bluetooth Low Energy (BLE) Thermal Printer Service & Characteristic UUIDs
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Chinese POS BLE Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC / Microchip BLE SPP
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Posnet / Xprinter BLE
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
  '0000af30-0000-1000-8000-00805f9b34fb', // Other common thermal
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HC-05/08 BLE
];

class BluetoothThermalPrinterService {
  private device: any = null;
  private characteristic: any = null;
  private connectedDeviceName: string | null = null;

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return typeof (navigator as any).bluetooth !== 'undefined';
  }

  public getConnectedDeviceName(): string | null {
    return this.connectedDeviceName;
  }

  public isConnected(): boolean {
    return Boolean(this.device && this.device.gatt?.connected && this.characteristic);
  }

  /**
   * Request Bluetooth device pair and connect GATT server
   */
  public async connect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Browser ini belum mendukung Web Bluetooth API. Silakan gunakan Google Chrome di Android/PC atau gunakan mode Cetak Sistem Browser.',
      };
    }

    try {
      // Prompt user to select Bluetooth printer
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_SERVICES,
      });

      if (!device) {
        return { success: false, error: 'Pencarian printer dibatalkan.' };
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.characteristic = null;
        this.connectedDeviceName = null;
      });

      const server = await device.gatt.connect();

      // Find first matching writable characteristic across known services
      let foundCharacteristic: any = null;
      for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              foundCharacteristic = char;
              break;
            }
          }
          if (foundCharacteristic) break;
        } catch {
          // Continue searching next service
        }
      }

      // If known service not found, attempt discovering any primary service
      if (!foundCharacteristic) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                foundCharacteristic = char;
                break;
              }
            }
            if (foundCharacteristic) break;
          }
        } catch {
          // Ignore
        }
      }

      if (!foundCharacteristic) {
        return {
          success: false,
          error: 'Printer terhubung, namun karakteristik tulis ESC/POS tidak ditemukan pada perangkat ini.',
        };
      }

      this.device = device;
      this.characteristic = foundCharacteristic;
      this.connectedDeviceName = device.name || 'Printer Bluetooth POS';

      return {
        success: true,
        deviceName: this.connectedDeviceName || undefined,
      };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { success: false, error: 'Pemilihan printer dibatalkan oleh pengguna.' };
      }
      return { success: false, error: err.message || 'Gagal menyambungkan printer Bluetooth.' };
    }
  }

  public disconnect(): void {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.connectedDeviceName = null;
  }

  /**
   * Print receipt directly via ESC/POS raw bytes
   */
  public async printReceipt(
    trx: PrintableTransaction,
    store: BusinessStoreInfo,
    actorName: string = 'Kasir'
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConnected()) {
      return {
        success: false,
        error: 'Printer Bluetooth belum terhubung. Silakan sambungkan printer terlebih dahulu.',
      };
    }

    try {
      const escPosData = this.generateEscPosBytes(trx, store, actorName);
      
      // Send data in chunks of 512 bytes to prevent BLE buffer overflow
      const chunkSize = 512;
      for (let i = 0; i < escPosData.length; i += chunkSize) {
        const chunk = escPosData.slice(i, i + chunkSize);
        if (this.characteristic.writeValueWithResponse) {
          await this.characteristic.writeValueWithResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengirim data cetak ke printer Bluetooth.' };
    }
  }

  /**
   * Build ESC/POS binary buffer
   */
  private generateEscPosBytes(
    trx: PrintableTransaction,
    store: BusinessStoreInfo,
    actorName: string
  ): Uint8Array {
    const bytes: number[] = [];

    // Helper: Push string encoded as ASCII/Windows-1252
    const pushText = (text: string) => {
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        bytes.push(code > 255 ? 63 : code); // replace non-ascii with '?'
      }
    };

    // ESC @ : Initialize printer
    bytes.push(0x1B, 0x40);

    // ESC a 1 : Center alignment
    bytes.push(0x1B, 0x61, 0x01);

    // ESC ! 0x30 : Double Height & Double Width for Store Name
    bytes.push(0x1B, 0x21, 0x30);
    pushText((store.business_name || 'PILIN STORE').toUpperCase() + '\n');

    // ESC ! 0x00 : Normal Font
    bytes.push(0x1B, 0x21, 0x00);
    if (store.business_address) {
      pushText(store.business_address + '\n');
    }
    if (store.business_phone) {
      pushText(`WA: ${store.business_phone}\n`);
    }

    pushText('NOTA TRANSAKSI POS\n');
    pushText('--------------------------------\n'); // 32 chars for 58mm

    // ESC a 0 : Left alignment
    bytes.push(0x1B, 0x61, 0x00);
    pushText(`No. Nota : ${trx.id}\n`);
    pushText(`Waktu    : ${trx.time}\n`);
    pushText(`Kasir    : ${actorName}\n`);
    pushText(`Pelanggan: ${trx.customer}\n`);
    pushText(`No. WA   : ${trx.phone}\n`);

    if (trx.estimatedCompletion) {
      pushText(`Est.Selesai: ${trx.estimatedCompletion}\n`);
    }

    pushText('--------------------------------\n');
    pushText('RINCIAN PESANAN:\n');

    const items = trx.items && trx.items.length > 0 ? trx.items : [
      {
        service: trx.service,
        qty: trx.qty,
        pricing_unit: trx.pricing_unit,
        price: trx.price,
        subtotal: trx.total,
      }
    ];

    items.forEach(it => {
      const lineLeft = `${it.service}`;
      const lineRight = `Rp ${it.subtotal.toLocaleString('id-ID')}`;
      const qtyLine = `  ${it.qty} ${it.pricing_unit || 'x'} @ Rp ${it.price.toLocaleString('id-ID')}`;
      
      pushText(`${lineLeft}\n`);
      // Right-aligned subtotal
      const padding = Math.max(1, 32 - qtyLine.length - lineRight.length);
      pushText(`${qtyLine}${' '.repeat(padding)}${lineRight}\n`);
    });

    pushText('--------------------------------\n');

    // Total & Payment
    const totalLabel = 'TOTAL:';
    const totalVal = `Rp ${trx.total.toLocaleString('id-ID')}`;
    const totalPad = Math.max(1, 32 - totalLabel.length - totalVal.length);
    
    // ESC ! 0x08 : Bold Font
    bytes.push(0x1B, 0x21, 0x08);
    pushText(`${totalLabel}${' '.repeat(totalPad)}${totalVal}\n`);
    bytes.push(0x1B, 0x21, 0x00);

    if (trx.payment_type === 'DP') {
      const dpLabel = `DP DITERIMA (${trx.method}):`;
      const dpVal = `Rp ${(trx.dp_amount || 0).toLocaleString('id-ID')}`;
      const dpPad = Math.max(1, 32 - dpLabel.length - dpVal.length);
      pushText(`${dpLabel}${' '.repeat(dpPad)}${dpVal}\n`);

      const sisaLabel = 'SISA TAGIHAN:';
      const sisaVal = `Rp ${(trx.remaining_amount || 0).toLocaleString('id-ID')}`;
      const sisaPad = Math.max(1, 32 - sisaLabel.length - sisaVal.length);
      bytes.push(0x1B, 0x21, 0x08);
      pushText(`${sisaLabel}${' '.repeat(sisaPad)}${sisaVal}\n`);
      bytes.push(0x1B, 0x21, 0x00);
      pushText('(Pelunasan saat pengambilan)\n');
    } else {
      const payLabel = 'PEMBAYARAN:';
      const payVal = `${trx.method} (LUNAS)`;
      const payPad = Math.max(1, 32 - payLabel.length - payVal.length);
      pushText(`${payLabel}${' '.repeat(payPad)}${payVal}\n`);
    }

    pushText('--------------------------------\n');

    // Terms & Conditions
    if (store.terms_and_conditions) {
      pushText('Syarat & Ketentuan:\n');
      pushText(store.terms_and_conditions.substring(0, 150) + '\n');
      pushText('--------------------------------\n');
    }

    // ESC a 1 : Center alignment footer
    bytes.push(0x1B, 0x61, 0x01);
    pushText('Terima Kasih Atas Kunjungan Anda\n');
    pushText('Simpan nota ini sebagai bukti sah\n');

    // Feed 4 lines
    bytes.push(0x1B, 0x64, 0x04);

    // GS V 0 : Partial Cut paper (if cutter supported)
    bytes.push(0x1D, 0x56, 0x00);

    return new Uint8Array(bytes);
  }
}

export const BluetoothPrinterService = new BluetoothThermalPrinterService();
