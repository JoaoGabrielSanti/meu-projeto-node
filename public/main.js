// Arquivo: /public/main.js

// Espera o HTML carregar antes de rodar o script
document.addEventListener('DOMContentLoaded', () => {

    // Pega os elementos da página (botão de abrir, wrapper do popup, botão de fechar)
    const btnAbrirPopup = document.getElementById('btn-abrir-popup');
    const popupWrapper = document.getElementById('popup-wrapper');
    const btnFecharPopup = document.getElementById('btn-fechar-popup');

    // Se o botão de ABRIR existir nesta página...
    if (btnAbrirPopup) {
        // ...ao clicar nele, mostre o popup
        btnAbrirPopup.addEventListener('click', () => {
            popupWrapper.style.display = 'flex'; // 'flex' centraliza o popup
        });
    }

    // Se o botão de FECHAR (Cancelar) existir...
    if (btnFecharPopup) {
        // ...ao clicar nele, esconda o popup
        btnFecharPopup.addEventListener('click', () => {
            popupWrapper.style.display = 'none';
        });
    }

    // Opcional: Clicar fora do "quadradinho" também fecha o popup
    if (popupWrapper) {
        popupWrapper.addEventListener('click', (e) => {
            // Se o clique foi no fundo cinza (o 'wrapper') e não no 'content'...
            if (e.target === popupWrapper) {
                popupWrapper.style.display = 'none';
            }
        });
    }
});
/* Arquivo: /public/main.js (ADICIONE NO FINAL) */

// --- CONTROLE DO MENU DE PERFIL ---
document.addEventListener('DOMContentLoaded', () => {

    const profileBtn = document.getElementById('profile-icon-btn');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            // "liga/desliga" a classe 'show'
            profileDropdown.classList.toggle('show');
        });
    }

    // Fecha o dropdown se clicar fora dele
    window.addEventListener('click', (e) => {
        if (profileDropdown && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
    });

});