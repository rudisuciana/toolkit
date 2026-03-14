/**
 * Mengelola fungsionalitas pengubah tema (light/dark mode)
 * dan menyimpan preferensi pengguna di localStorage agar tetap diingat saat refresh.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Mengambil elemen tombol toggle tema (biasanya di header)
    const themeToggle = document.getElementById('theme-toggle');

    // Hanya jalankan jika tombol pengubah tema ada di halaman ini
    // (Mencegah error di halaman login yang mungkin tidak punya tombol ini)
    if (themeToggle) {
        // Ambil tema yang tersimpan dari localStorage sesi sebelumnya.
        // Jika tidak ada, defaultnya adalah 'light' (Mode Terang).
        const currentTheme = localStorage.getItem('theme') || 'light';

        // Terapkan tema yang tersimpan saat halaman pertama kali dimuat
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-theme'); // Tambahkan class CSS untuk dark mode
            themeToggle.textContent = '🌙'; // Ubah ikon menjadi bulan (menandakan aktif mode malam)
        } else {
            themeToggle.textContent = '☀️'; // Pastikan ikon adalah matahari
        }

        // Tambahkan event listener 'click' untuk tombol pengubah tema
        themeToggle.addEventListener('click', () => {
            // Toggle: Jika ada class 'dark-theme' hapus, jika tidak ada tambahkan.
            document.body.classList.toggle('dark-theme');

            // Tentukan tema yang sekarang aktif setelah di-toggle
            let newTheme = 'light';
            
            // Cek apakah body sekarang memiliki class dark-theme
            if (document.body.classList.contains('dark-theme')) {
                newTheme = 'dark';
                themeToggle.textContent = '🌙'; // Ganti ikon menjadi bulan
            } else {
                themeToggle.textContent = '☀️'; // Ganti ikon menjadi matahari
            }

            // Simpan pilihan tema baru ke localStorage browser
            // Ini memastikan tema tetap sama meskipun halaman di-refresh atau pindah halaman
            localStorage.setItem('theme', newTheme);
        });
    }
});
