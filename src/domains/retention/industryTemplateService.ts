export type IndustryCategory = 
  | 'SPA_SALON'
  | 'FITNESS_GYM'
  | 'TOKO_KUE'
  | 'PET_SHOP'
  | 'SHOE_LEATHER'
  | 'LAUNDRY_CLOTHES'
  | 'AUTO_CARE';

export interface IndustryTemplate {
  id: IndustryCategory;
  name: string;
  icon: string;
  default_grooming_days: number;
  template_reminder: string;
  template_sapaan: string;
  template_hypnoselling: string;
}

export class IndustryTemplateService {
  private static templates: Record<IndustryCategory, IndustryTemplate> = {
    SPA_SALON: {
      id: 'SPA_SALON',
      name: 'Spa & Salon Kecantikan',
      icon: '💆‍♀️',
      default_grooming_days: 30,
      template_reminder: 'Halo Kak {{nama}}, sudah 30 hari nih sejak perawatan {{item}} terakhirmu di Spa & Salon kami. 💆‍♀️ Waktunya relaksasi dan manjakan dirimu kembali! Yuk booking slot perawatan favoritmu minggu ini.',
      template_sapaan: 'Halo Kak {{nama}}, terima kasih telah melakukan perawatan {{item}} di tempat kami. Semoga harimu menyenangkan & segar selalu!',
      template_hypnoselling: 'Halo Kak {{nama}}, khusus minggu ini ada penawaran spesial paket relaksasi {{item}} untuk pelanggan setia kami. Dapatkan diskon khusus treatment!'
    },
    FITNESS_GYM: {
      id: 'FITNESS_GYM',
      name: 'Fitness / Gym & Health Club',
      icon: '🏋️‍♂️',
      default_grooming_days: 30,
      template_reminder: 'Halo Kak {{nama}}, jadwal latihan & paket membership {{item}} kamu sudah memasuki periode renewal nih! 🏋️‍♂️ Tetap konsisten jaga kebugaran & goal sehatmu bersama kami. Yuk reservasi sesimu minggu ini!',
      template_sapaan: 'Halo Kak {{nama}}, salam sehat dari tim Fitness! Terima kasih telah berkunjung & sesi latihan {{item}} hari ini.',
      template_hypnoselling: 'Halo Kak {{nama}}, tingkatkan pencapaian fitness kamu! Kami ada promo bundling suplemen & personal trainer untuk {{item}}.'
    },
    TOKO_KUE: {
      id: 'TOKO_KUE',
      name: 'Toko Kue / Bakery & Pastry',
      icon: '🎂',
      default_grooming_days: 14,
      template_reminder: 'Halo Kak {{nama}}, rindu dengan kelezatan {{item}} segar khas toko kue kami? 🎂 Waktunya lengkapi momen manis keluarga atau camilan soremu dengan varian cake terfavorit. Pesan sekarang yuk!',
      template_sapaan: 'Halo Kak {{nama}}, terima kasih telah memesan {{item}} di Toko Kue kami. Selamat menikmati kue hangat & lezat!',
      template_hypnoselling: 'Halo Kak {{nama}}, minggu ini ada varian cake & pastry terbaru untuk pemesan {{item}} sebelumnya. Dapatkan promo potongan khusus!'
    },
    PET_SHOP: {
      id: 'PET_SHOP',
      name: 'Pet Shop & Pet Clinic',
      icon: '🐾',
      default_grooming_days: 30,
      template_reminder: 'Halo Kak {{nama}}, stok pakan {{item}} untuk anabul kesayanganmu diperkirakan sudah mau habis nih! 🐾 Waktunya restock pakan & jadwal grooming rutin minggu ini. Yuk mampir kembali!',
      template_sapaan: 'Halo Kak {{nama}}, terima kasih telah membawa anabul kesayangan untuk {{item}} di Pet Shop kami. Semoga sehat & lincah selalu!',
      template_hypnoselling: 'Halo Kak {{nama}}, anabul kesayangan butuh vitamin & perawatan ekstra? Cek paket promo grooming & pakan {{item}} terbaru kami!'
    },
    SHOE_LEATHER: {
      id: 'SHOE_LEATHER',
      name: 'Shoe & Leather Care (Laundry Sepatu/Tas)',
      icon: '👞',
      default_grooming_days: 30,
      template_reminder: 'Halo Kak {{nama}}, barang kesayanganmu ({{item}}) yang di-service bulan lalu sudah waktunya perawatan rutin H+30 nih! 👟 Biar tetap awet & mengkilap, yuk mampir kembali!',
      template_sapaan: 'Halo Kak {{nama}}, terima kasih telah mempercayakan pengerjaan {{item}} di tempat kami. Semoga puas dengan hasil cuci & repaint kami!',
      template_hypnoselling: 'Halo Kak {{nama}}, nikmati promo unyellowing & nano-waterproofing untuk perawatan {{item}} berikutnya minggu ini!'
    },
    LAUNDRY_CLOTHES: {
      id: 'LAUNDRY_CLOTHES',
      name: 'Laundry Pakaian & Dry Clean',
      icon: '👗',
      default_grooming_days: 14,
      template_reminder: 'Halo Kak {{nama}}, sprei & pakaian ({{item}}) kesayangan keluarga sudah waktunya cuci berkala kembali nih. 🧺 Tim kami siap jemput/terima laundrymu hari ini!',
      template_sapaan: 'Halo Kak {{nama}}, laundry {{item}} kamu sudah selesai & wangi! Terima kasih telah menggunakan jasa laundry kami.',
      template_hypnoselling: 'Halo Kak {{nama}}, ada diskon khusus cuci bedcover & dry clean untuk pelanggan {{item}} di minggu ini!'
    },
    AUTO_CARE: {
      id: 'AUTO_CARE',
      name: 'Auto Care / Car Wash & Detailing',
      icon: '🚗',
      default_grooming_days: 30,
      template_reminder: 'Halo Kak {{nama}}, kendaraan ({{item}}) kesayanganmu sudah waktunya perawatan cuci & maintenance coating berkala nih. 🚘 Dapatkan promo khusus minggu ini!',
      template_sapaan: 'Halo Kak {{nama}}, terima kasih telah mempercayakan perawatan {{item}} di bengkel/autocare kami. Salam berkendara aman!',
      template_hypnoselling: 'Halo Kak {{nama}}, lindungi cat kendaranmu lebih lama! Dapatkan voucher khusus poles & coating {{item}}.'
    }
  };

  static getCategories(): IndustryTemplate[] {
    return Object.values(this.templates);
  }

  static getTemplate(category: IndustryCategory): IndustryTemplate {
    return this.templates[category] || this.templates.SHOE_LEATHER;
  }

  static renderMessage(
    templateText: string,
    params: { nama: string; item: string; nota_id?: string }
  ): string {
    return templateText
      .replace(/\{\{nama\}\}/g, params.nama)
      .replace(/\{\{item\}\}/g, params.item)
      .replace(/\{\{nota_id\}\}/g, params.nota_id || 'TRX-POS');
  }
}
