/**
 * Mengelola fungsionalitas menu dropdown (accordion) di sidebar.
 * Menangani klik pada menu induk untuk menampilkan/menyembunyikan submenu.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Seleksi semua elemen pemicu (link menu utama yang punya anak)
    const submenuToggles = document.querySelectorAll('.has-submenu .main-menu-link');

    // Loop setiap elemen untuk memasang event listener
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', (event) => {
            // Mencegah browser melakukan navigasi/reload (karena biasanya href="#")
            event.preventDefault();

            // Mencari elemen pembungkus terdekat (li.has-submenu)
            // 'closest' sangat berguna jika struktur HTML berubah sedikit di dalam elemen
            const parentMenuItem = toggle.closest('.has-submenu');

            // Toggle kelas 'active'
            // Jika ada kelas 'active', CSS akan mengubah max-height submenu menjadi besar (terbuka)
            // Jika dihapus, max-height kembali ke 0 (tertutup)
            if (parentMenuItem) {
                parentMenuItem.classList.toggle('active');
            }
        });
    });
});
