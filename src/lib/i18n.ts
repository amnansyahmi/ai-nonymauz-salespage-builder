import type { Lang } from './types';

/* Words that appear on the customer's page. */
export const L: Record<Lang, Record<string, string>> = {
  ms: {
    days: 'Hari', hours: 'Jam', mins: 'Minit', secs: 'Saat',
    name: 'Nama penuh', phone: 'No. telefon', address: 'Alamat penghantaran', note: 'Nota (pilihan)',
    subtotal: 'Harga barang', total: 'Jumlah', free: 'PERCUMA',
    pickItem: 'Sila pilih sekurang-kurangnya 1 item.', needName: 'Sila isi nama dan no. telefon.',
    needAddr: 'Sila isi alamat penghantaran.', orderIntro: 'Hai! Saya nak buat tempahan',
    customer: 'Maklumat anda', expired: 'Tawaran telah tamat', save: 'Jimat',
    freeShipFrom: 'Penghantaran percuma untuk belian', noWa: 'Penjual belum isi nombor WhatsApp.',
    worth: 'Nilai', chat: 'Hai, saya nak tahu lebih lanjut.', less: 'Kurang', more: 'Tambah',
  },
  en: {
    days: 'Days', hours: 'Hours', mins: 'Mins', secs: 'Secs',
    name: 'Full name', phone: 'Phone number', address: 'Delivery address', note: 'Note (optional)',
    subtotal: 'Items', total: 'Total', free: 'FREE',
    pickItem: 'Please choose at least 1 item.', needName: 'Please fill in your name and phone number.',
    needAddr: 'Please fill in your delivery address.', orderIntro: 'Hi! I would like to order',
    customer: 'Your details', expired: 'This offer has ended', save: 'Save',
    freeShipFrom: 'Free delivery for orders from', noWa: 'The seller has not added a WhatsApp number yet.',
    worth: 'Worth', chat: 'Hi, I would like to know more.', less: 'Less', more: 'More',
  },
};
