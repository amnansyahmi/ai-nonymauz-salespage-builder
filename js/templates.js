/* Starter templates. Content is example copy in Bahasa Melayu; sellers replace it with their own. */
(function (SP) {
  'use strict';
  var B = SP.makeBlock;

  function page(name, preset, font, corners, settings, blocks, look) {
    var t = SP.defaultTheme(preset);
    t.font = font; t.corners = corners; t.look = look || 'classic';
    return {
      name: name, theme: t,
      settings: Object.assign({ businessName: '', whatsapp: '', lang: 'ms', waFloat: true, sticky: true, stickyText: 'Order sekarang', stickyLink: '#order', seoTitle: '', seoDesc: '', pixelId: '' }, settings),
      blocks: blocks
    };
  }

  SP.templates = [
    {
      id: 'food', name: 'Food & homemade products', desc: 'Sambal, kuih, frozen food, skincare. Packages, delivery fees and WhatsApp orders.',
      build: function () {
        return page('Sambal Garing', 'cili', 'slab', 'sharp', { businessName: 'Dapur Mak Long' }, [
          B('hero', { eyebrow: 'Berat bersih 250 g · Tiada pengawet · Tahan 3 bulan', headline: 'Sambal Garing', sub: 'Ikan bilis rangup sampai hujung botol. Makan dengan nasi panas, roti atau mi segera.', btnText: 'Saya nak order', bg: 'dark' }),
          B('countdown', { heading: 'Promo batch ini tamat dalam', mode: 'evergreen', minutes: 2880, bg: 'default' }),
          B('benefits', { heading: 'Pernah rasa macam ni?', style: 'cross', items: [{ text: 'Balik kerja penat, tak sempat masak lauk' }, { text: 'Sambal kedai terlalu manis dan berminyak' }, { text: 'Seminggu buka botol, dah lemau' }], bg: 'soft' }),
          B('benefits', { heading: 'Kenapa pelanggan **repeat order**', style: 'check', items: [{ text: 'Ikan bilis gred A, digoreng sampai rangup' }, { text: 'Tiada pengawet dan tiada pewarna' }, { text: 'Botol kedap udara, tahan 3 bulan' }, { text: 'Sesuai dibawa ke asrama, luar negara dan kenduri' }], bg: 'default' }),
          B('testimonials', { heading: 'Apa kata pelanggan', items: [
            { name: 'Kak Ana', info: 'Shah Alam', quote: 'Anak-anak saya suka sangat. Sekali order terus 5 botol.', image: '', stars: 5 },
            { name: 'Hafiz', info: 'Kuantan', quote: 'Rangup sampai hujung botol. Padu dengan nasi lemak.', image: '', stars: 5 },
            { name: 'Puan Rohani', info: 'Kota Bharu', quote: 'Sampai dalam 3 hari, botol berbalut elok.', image: '', stars: 5 },
            { name: 'Daniel', info: 'Kuching', quote: 'Order ke Sarawak pun cepat. Pedas dia ngam.', image: '', stars: 5 }
          ], bg: 'dark' }),
          B('order', { heading: 'Pilih pakej anda', sub: 'Lebih banyak, lebih jimat. Jumlah dikira automatik.', items: [
            { name: '1 Botol (250g)', desc: 'Cuba dulu', price: 18, oldPrice: 22, image: '', badge: '' },
            { name: 'Combo 3 Botol', desc: 'Untuk keluarga', price: 48, oldPrice: 66, image: '', badge: 'Paling laris' },
            { name: 'Combo 6 + 1 Percuma', desc: '7 botol, sesuai untuk dijual semula', price: 90, oldPrice: 154, image: '', badge: 'Jimat RM64' }
          ], shipping: [{ label: 'Semenanjung Malaysia', fee: 8 }, { label: 'Sabah & Sarawak', fee: 15 }, { label: 'Ambil sendiri (Shah Alam)', fee: 0 }], freeShipMin: 90, bg: 'soft' }),
          B('guarantee', { badge: 'Ganti baru', title: 'Jaminan sampai elok', text: 'Jika botol pecah atau rosak semasa penghantaran, hantar gambar kepada kami dan kami ganti baru.', bg: 'default' }),
          B('faq', { heading: 'Soalan lazim', items: [
            { q: 'Berapa lama boleh tahan?', a: 'Tahan 3 bulan pada suhu bilik. Selepas dibuka, simpan dalam peti sejuk.' },
            { q: 'Pedas sangat ke?', a: 'Tahap pedas sederhana. Nak kurang pedas? Tulis dalam nota semasa order.' },
            { q: 'Berapa lama penghantaran?', a: '2-4 hari bekerja untuk Semenanjung, 4-7 hari untuk Sabah & Sarawak.' },
            { q: 'Boleh jadi ejen?', a: 'Boleh. Pilih Combo 6 + 1 dan WhatsApp kami untuk harga ejen.' }
          ], bg: 'default' }),
          B('cta', { heading: 'Stok batch ini terhad.', text: 'Kami masak setiap minggu dalam kuantiti kecil supaya sentiasa segar.', btnText: 'Order', bg: 'primary' }),
          B('footer', { business: 'Dapur Mak Long', reg: 'SSM: (masukkan no. pendaftaran anda)', contact: 'Shah Alam, Selangor', bg: 'dark' })
        ], 'label');
      }
    },
    {
      id: 'digital', name: 'Ebook, course or class', desc: 'Digital products and workshops. Price box, bonuses and a money-back promise.',
      build: function () {
        return page('Kelas Jualan Online', 'bab', 'hanken', 'sharp', { businessName: 'Akademi Niaga Kecil', stickyText: 'Daftar sekarang · RM39' }, [
          B('hero', { eyebrow: 'Ebook 80 muka surat + 5 video ringkas', headline: '30 order pertama', sub: 'Dari TikTok dan Facebook. Panduan langkah demi langkah untuk peniaga kecil yang baru bermula. Tiada bajet iklan besar diperlukan.', btnText: 'Saya nak belajar', bg: 'default' }),
          B('video', { heading: '', url: '', caption: 'Tonton video pengenalan 2 minit', bg: 'default' }),
          B('benefits', { heading: 'Apa yang anda akan belajar', style: 'number', items: [{ text: 'Cara pilih produk yang orang **memang cari**' }, { text: 'Tulis caption yang buat orang terus DM' }, { text: 'Susun posting 30 hari tanpa pening kepala' }, { text: 'Tutup jualan di WhatsApp dengan skrip sedia ada' }], bg: 'soft' }),
          B('bonus', { heading: '3 bonus percuma', items: [
            { title: '50 template caption', desc: 'Salin, tukar nama produk, terus post.', value: 49 },
            { title: 'Skrip balas WhatsApp', desc: 'Untuk soalan harga, COD dan follow-up.', value: 29 },
            { title: 'Kalendar posting 30 hari', desc: 'Dalam format Google Sheets.', value: 19 }
          ], note: 'Bonus hanya untuk pendaftaran sebelum promosi tamat', bg: 'default' }),
          B('pricing', { badge: 'Harga pelancaran', title: 'Pakej Lengkap', oldPrice: 129, price: 39, priceNote: 'Sekali bayar. Akses selamanya.', items: [{ text: 'Ebook 80 muka surat (PDF)' }, { text: '5 video ringkas' }, { text: '3 bonus bernilai RM97' }, { text: 'Akses group sokongan Telegram' }], btnText: 'Saya nak pakej ini', note: 'Harga akan naik ke RM129 selepas pelancaran', bg: 'soft' }),
          B('testimonials', { heading: 'Mereka dah cuba', items: [
            { name: 'Aina', info: 'Jual tudung, Johor Bahru', quote: 'Minggu pertama guna template caption, dapat 12 order. Sebelum ni 2-3 je.', image: '', stars: 5 },
            { name: 'Faizal', info: 'Kedai kek, Ipoh', quote: 'Skrip WhatsApp tu paling berguna. Customer tak lari lepas tanya harga.', image: '', stars: 5 }
          ], bg: 'default' }),
          B('countdown', { heading: 'Promo tamat dalam', mode: 'date', bg: 'dark' }),
          B('order', { heading: 'Daftar sekarang', sub: '', items: [{ name: 'Pakej Lengkap', desc: 'Ebook + video + 3 bonus', price: 39, oldPrice: 129, image: '', badge: 'Promo' }], shipping: [], askAddress: false, askNote: false, btnText: 'Daftar melalui WhatsApp', payNote: 'Selepas bayaran disahkan, link muat turun dihantar ke WhatsApp anda dalam masa 1 jam.', bg: 'soft' }),
          B('guarantee', { badge: '7 Hari', title: 'Jaminan wang dikembalikan', text: 'Cuba dulu selama 7 hari. Jika tidak berpuas hati, WhatsApp kami dan kami pulangkan wang anda sepenuhnya.', bg: 'default' }),
          B('faq', { heading: 'Soalan lazim', items: [
            { q: 'Saya tak pandai teknologi. Boleh ikut?', a: 'Boleh. Semua langkah ditunjuk dengan gambar skrin, dan video ditonton terus dari telefon.' },
            { q: 'Bila saya dapat ebook?', a: 'Dalam masa 1 jam selepas bayaran disahkan, melalui WhatsApp.' },
            { q: 'Perlu bayar iklan ke?', a: 'Tidak. Panduan ini fokus kepada jualan organik dahulu.' }
          ], bg: 'default' }),
          B('cta', { heading: 'Mula minggu ini.', text: 'RM39 sekali bayar. Ebook dan video sampai di WhatsApp anda dalam masa 1 jam.', btnText: 'Daftar', btnLink: '#order', bg: 'default' }),
          B('footer', { business: 'Akademi Niaga Kecil', reg: 'SSM: (masukkan no. pendaftaran anda)', contact: 'Sokongan: WhatsApp, Isnin–Jumaat 9 pagi–6 petang', bg: 'dark' })
        ], 'chapters');
      }
    },
    {
      id: 'service', name: 'Service booking', desc: 'Aircond, cleaning, catering, photography. Services with area-based charges.',
      build: function () {
        return page('Servis Aircond', 'langit', 'stack', 'soft', { businessName: 'Sejuk Pro Servis', stickyText: 'Tempah slot sekarang' }, [
          B('hero', { eyebrow: 'Lembah Klang · 7 hari seminggu', headline: 'Aircond tak sejuk?', sub: 'Kami datang esok. Cuci, servis dan baiki aircond rumah. Juruteknik bertauliah, harga jelas sebelum mula kerja.', btnText: 'Tempah slot', align: 'left', bg: 'default' }),
          B('benefits', { heading: 'Kenapa pilih kami', style: 'check', items: [{ text: 'Harga tetap, tiada caj tersembunyi' }, { text: 'Juruteknik datang tepat masa, atau servis seterusnya percuma' }, { text: 'Lantai dan dinding dilindungi semasa kerja' }, { text: 'Waranti servis 30 hari' }], bg: 'soft' }),
          B('order', { heading: 'Pilih servis', sub: 'Pilih bilangan unit aircond untuk setiap jenis servis.', items: [
            { name: 'Cuci biasa (1.0 – 1.5HP)', desc: 'Cuci filter, coil dan saluran air', price: 80, oldPrice: 0, image: '', badge: '' },
            { name: 'Chemical wash (1.0 – 1.5HP)', desc: 'Untuk aircond yang lama tak dicuci', price: 150, oldPrice: 180, image: '', badge: 'Disyorkan' },
            { name: 'Top-up gas', desc: 'R32 / R410A', price: 120, oldPrice: 0, image: '', badge: '' }
          ], shipLabel: 'Kawasan', shipping: [{ label: 'Kuala Lumpur & Petaling Jaya', fee: 0 }, { label: 'Shah Alam, Klang & Subang', fee: 20 }, { label: 'Kajang, Bangi & Putrajaya', fee: 30 }], askAddress: true, askNote: true, btnText: 'Tempah melalui WhatsApp', payNote: 'Bayar selepas kerja siap. Tunai, transfer atau DuitNow QR.', bg: 'soft' }),
          B('testimonials', { heading: 'Ulasan pelanggan', items: [
            { name: 'Encik Rahman', info: 'Puchong', quote: 'Datang awal 10 minit, kerja kemas. Bilik terus sejuk malam tu.', image: '', stars: 5 },
            { name: 'Mei Ling', info: 'Petaling Jaya', quote: 'Harga sama macam yang disebut. Tak ada tambah-tambah.', image: '', stars: 5 }
          ], bg: 'default' }),
          B('faq', { heading: 'Soalan lazim', items: [
            { q: 'Berapa lama satu unit?', a: 'Cuci biasa sekitar 45 minit. Chemical wash sekitar 1.5 jam.' },
            { q: 'Perlu ada orang di rumah?', a: 'Ya, sekurang-kurangnya seorang dewasa semasa kerja dijalankan.' }
          ], bg: 'default' }),
          B('cta', { heading: 'Slot hujung minggu cepat penuh', text: 'Tempah awal untuk dapatkan masa yang anda mahu.', btnText: 'Tempah slot', bg: 'primary' }),
          B('footer', { business: 'Sejuk Pro Servis', reg: 'SSM: (masukkan no. pendaftaran anda)', contact: 'Beroperasi 9 pagi – 7 malam, setiap hari', bg: 'dark' })
        ], 'unit');
      }
    },
    {
      id: 'blank', name: 'One product', desc: 'Your product photo stays on screen while customers read and order. A quick start for any product.',
      build: function () {
        return page('Salespage baru', 'marun', 'literata', 'soft', { businessName: 'Nama Kedai Anda', stickyText: 'Order sekarang' }, [
          B('hero', { eyebrow: 'Dihantar seluruh Malaysia', headline: 'Nama produk anda', sub: 'Satu ayat tentang apa yang pelanggan dapat, dan kenapa ia berbaloi.', btnText: 'Saya nak order', bg: 'default' }),
          B('benefits', { heading: 'Kenapa pelanggan suka', style: 'check', items: [{ text: 'Kelebihan pertama, dalam bahasa pelanggan' }, { text: 'Kelebihan kedua, dengan nombor jika ada' }, { text: 'Kelebihan ketiga, yang pesaing tak boleh tiru' }], bg: 'soft' }),
          B('order', { heading: 'Pilih pakej', sub: '', items: [
            { name: 'Satu unit', desc: 'Untuk cuba dulu', price: 29, oldPrice: 0, image: '', badge: '' },
            { name: 'Pakej tiga', desc: 'Paling jimat', price: 79, oldPrice: 87, image: '', badge: 'Paling laris' }
          ], bg: 'default' }),
          B('faq', { heading: 'Soalan lazim', bg: 'default' }),
          B('footer', { business: 'Nama Kedai Anda', reg: 'SSM: (masukkan no. pendaftaran anda)', contact: 'Bandar, Negeri', bg: 'primary' })
        ], 'stage');
      }
    }
  ];
})(window.SP);
