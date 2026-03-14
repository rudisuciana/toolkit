/**
 * Mengelola fungsionalitas buka-tutup sidebar navigasi.
 * Script ini dijalankan setelah seluruh DOM (HTML) selesai dimuat.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Ambil elemen-elemen UI penting dari halaman
    const menuToggle = document.getElementById('menu-toggle'); // Tombol hamburger di header
    const sidebar = document.getElementById('sidebar');       // Elemen navigasi samping
    const overlay = document.getElementById('overlay');       // Layar gelap penutup konten utama

    // Validasi: Pastikan elemen-elemen tersebut ada di halaman saat ini
    // (Berguna agar tidak error di halaman Login/Register yang tidak punya sidebar)
    if (menuToggle && sidebar && overlay) {
        
        /**
         * Fungsi untuk membuka sidebar
         * Menambahkan class 'open' (CSS transform) dan 'active' (opacity overlay)
         */
        const openSidebar = () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        };

        /**
         * Fungsi untuk menutup sidebar
         * Menghapus class sehingga tampilan kembali ke kondisi semula
         */
        const closeSidebar = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };

        // Event Listener: Saat tombol menu diklik
        menuToggle.addEventListener('click', (event) => {
            // preventDefault/stopPropagation mencegah aksi default browser atau bubbling event
            event.stopPropagation(); 
            openSidebar();
        });

        // Event Listener: Saat overlay (area luar sidebar) diklik, tutup sidebar
        overlay.addEventListener('click', closeSidebar);
    }
});
