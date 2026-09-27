/* =========================================================
   MERCADO FÁCIL
   SCRIPT.JS
========================================================= */


/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const CONFIG = {
    loadingDuration: 2600,
    particleCount: 35,

    marketSearchRadius: 5000,
    maxMarkets: 20,

    viaCepUrl: "https://viacep.com.br/ws",
    nominatimUrl: "https://nominatim.openstreetmap.org/search",

    overpassUrls: [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter"
    ],

    storageKey: "mercadoFacilShoppingList"
};


/* =========================================================
   ESTADO
========================================================= */

const appState = {
    currentScreen: "splash",

    shoppingList: [],

    selectedCategory: "Mercearia",

    transitionLocked: false
};


const nearbyState = {
    cep: "",
    address: "",
    latitude: null,
    longitude: null,
    markets: []
};


const confirmModalState = {
    onConfirm: null,
    onCancel: null
};


/* =========================================================
   CATEGORIAS
========================================================= */

const categoryMap = {
    "Hortifruti": "fa-apple-whole",
    "Carnes": "fa-drumstick-bite",
    "Laticínios": "fa-cheese",
    "Bebidas": "fa-bottle-water",
    "Padaria": "fa-bread-slice",
    "Mercearia": "fa-box-open",
    "Limpeza": "fa-spray-can-sparkles",
    "Higiene": "fa-pump-soap",
    "Congelados": "fa-snowflake",
    "Outros": "fa-basket-shopping"
};


/* =========================================================
   REFERÊNCIAS DOM
========================================================= */

const splashScreen = document.getElementById("splashScreen");
const menuScreen = document.getElementById("menuScreen");
const createListScreen = document.getElementById("createListScreen");
const viewListScreen = document.getElementById("viewListScreen");
const nearbyMarketsScreen = document.getElementById("nearbyMarketsScreen");

const enterButton = document.getElementById("enterButton");

const loadingOverlay = document.getElementById("loadingOverlay");
const loadingProgress = document.getElementById("loadingProgress");
const loadingPercentage = document.getElementById("loadingPercentage");
const loadingText = document.getElementById("loadingText");

const particlesContainer = document.getElementById("particles");

const disconnectButton = document.getElementById("disconnectButton");

const backFromCreate = document.getElementById("backFromCreate");
const backFromView = document.getElementById("backFromView");
const backFromNearby = document.getElementById("backFromNearby");


/* =========================================================
   ELEMENTOS DA LISTA
========================================================= */

const productInput = document.getElementById("productInput");
const quantityInput = document.getElementById("quantityInput");
const addItemButton = document.getElementById("addItemButton");

const createListMessage = document.getElementById("createListMessage");
const createdItemsList = document.getElementById("createdItemsList");
const createdListEmpty = document.getElementById("createdListEmpty");
const createListCount = document.getElementById("createListCount");
const clearListButton = document.getElementById("clearListButton");

const priceItemsList = document.getElementById("priceItemsList");
const priceListEmpty = document.getElementById("priceListEmpty");
const viewListCount = document.getElementById("viewListCount");
const grandTotal = document.getElementById("grandTotal");


/* =========================================================
   CATEGORIA
========================================================= */

const categorySelect = document.getElementById("categorySelect");
const categoryListboxButton = document.getElementById("categoryListboxButton");
const categorySelectedLabel = document.getElementById("categorySelectedLabel");
const categoryOptions = document.getElementById("categoryOptions");


/* =========================================================
   MERCADOS
========================================================= */

const cepInput = document.getElementById("cepInput");
const cepMessage = document.getElementById("cepMessage");

const searchMarketsButton = document.getElementById("searchMarketsButton");
const changeCepButton = document.getElementById("changeCepButton");

const locatedAddressCard = document.getElementById("locatedAddressCard");
const locatedAddress = document.getElementById("locatedAddress");

const marketsLoading = document.getElementById("marketsLoading");
const marketsResults = document.getElementById("marketsResults");
const marketsList = document.getElementById("marketsList");
const marketsCount = document.getElementById("marketsCount");

const marketsEmpty = document.getElementById("marketsEmpty");

const marketsError = document.getElementById("marketsError");
const marketsErrorText = document.getElementById("marketsErrorText");
const retryMarketsButton = document.getElementById("retryMarketsButton");


/* =========================================================
   MODAL
========================================================= */

const confirmModal = document.getElementById("confirmModal");
const confirmModalClose = document.getElementById("confirmModalClose");
const confirmModalCancel = document.getElementById("confirmModalCancel");
const confirmModalConfirm = document.getElementById("confirmModalConfirm");

const confirmModalIcon = document.getElementById("confirmModalIcon");
const confirmModalIconWrapper = document.getElementById("confirmModalIconWrapper");
const confirmModalKicker = document.getElementById("confirmModalKicker");
const confirmModalTitle = document.getElementById("confirmModalTitle");
const confirmModalMessage = document.getElementById("confirmModalMessage");


/* =========================================================
   TOAST
========================================================= */

const toast = document.getElementById("toast");
const toastIcon = document.getElementById("toastIcon");
const toastMessage = document.getElementById("toastMessage");

let toastTimer = null;


/* =========================================================
   FORMATAÇÃO DE MOEDA
========================================================= */

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function initializeApp() {

    loadShoppingList();

    createParticles();

    setupEnterButton();

    setupMenuButtons();

    setupNavigationButtons();

    setupShoppingList();

    setupCategorySelect();

    setupNearbyMarkets();

    setupConfirmModal();

    setupKeyboardShortcuts();

    renderCreatedItems();

    renderPriceItems();

}


/* =========================================================
   PARTÍCULAS
========================================================= */

function createParticles() {

    if (!particlesContainer) {
        return;
    }

    particlesContainer.innerHTML = "";

    for (let i = 0; i < CONFIG.particleCount; i++) {

        const particle = document.createElement("span");

        particle.className = "particle";

        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${8 + Math.random() * 12}s`;
        particle.style.animationDelay = `${Math.random() * -15}s`;

        const size = 2 + Math.random() * 4;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        particlesContainer.appendChild(particle);
    }
}


/* =========================================================
   BOTÃO ENTRAR
========================================================= */

function setupEnterButton() {

    if (!enterButton) {
        return;
    }

    enterButton.addEventListener("click", enterMarket);
}


/* =========================================================
   ENTRAR NO MERCADO
========================================================= */

function enterMarket() {

    if (appState.transitionLocked) {
        return;
    }

    appState.transitionLocked = true;

    if (loadingOverlay) {
        loadingOverlay.classList.remove("hidden");
    }

    let progress = 0;

    if (loadingProgress) {
        loadingProgress.style.width = "0%";
    }

    if (loadingPercentage) {
        loadingPercentage.textContent = "0%";
    }

    if (loadingText) {
        loadingText.textContent = "Preparando o mercado...";
    }

    const startTime = performance.now();

    const messages = [
        "Preparando o mercado...",
        "Organizando produtos...",
        "Carregando sua experiência...",
        "Tudo pronto!"
    ];

    const progressInterval = setInterval(() => {

        const elapsed = performance.now() - startTime;

        progress = Math.min(
            100,
            (elapsed / CONFIG.loadingDuration) * 100
        );

        if (loadingProgress) {
            loadingProgress.style.width = `${progress}%`;
        }

        if (loadingPercentage) {
            loadingPercentage.textContent = `${Math.round(progress)}%`;
        }

        const index = Math.min(
            messages.length - 1,
            Math.floor(progress / 30)
        );

        if (loadingText) {
            loadingText.textContent = messages[index];
        }

    }, 35);


    setTimeout(() => {

        clearInterval(progressInterval);

        if (loadingProgress) {
            loadingProgress.style.width = "100%";
        }

        if (loadingPercentage) {
            loadingPercentage.textContent = "100%";
        }

        if (loadingText) {
            loadingText.textContent = "Tudo pronto!";
        }

        setTimeout(() => {

            if (loadingOverlay) {
                loadingOverlay.classList.add("hidden");
            }

            appState.transitionLocked = false;

            switchScreen("menu");

        }, 250);

    }, CONFIG.loadingDuration);
}


/* =========================================================
   MENU
========================================================= */

function setupMenuButtons() {

    const menuCards = document.querySelectorAll(".menu-card");

    menuCards.forEach(card => {

        card.addEventListener("click", () => {

            const action = card.dataset.action;

            handleMenuAction(action);

        });

    });


    if (disconnectButton) {

        disconnectButton.addEventListener(
            "click",
            requestDisconnect
        );

    }
}


/* =========================================================
   AÇÕES DO MENU
========================================================= */

function handleMenuAction(action) {

    switch (action) {

        case "create":
            openCreateList();
            break;

        case "view":
            openShoppingList();
            break;

        case "nearby":
            openNearbyMarkets();
            break;

    }
}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function setupNavigationButtons() {

    if (backFromCreate) {

        backFromCreate.addEventListener(
            "click",
            () => switchScreen("menu")
        );

    }

    if (backFromView) {

        backFromView.addEventListener(
            "click",
            () => switchScreen("menu")
        );

    }

    if (backFromNearby) {

        backFromNearby.addEventListener(
            "click",
            () => switchScreen("menu")
        );

    }
}


/* =========================================================
   TROCA DE TELA
========================================================= */

function switchScreen(target) {

    const screens = {
        menu: menuScreen,
        create: createListScreen,
        view: viewListScreen,
        nearby: nearbyMarketsScreen
    };

    const transitions = {
        menu: "transition-menu",
        create: "transition-create",
        view: "transition-view",
        nearby: "transition-nearby"
    };

    const targetScreen = screens[target];

    if (!targetScreen) {
        return;
    }

    const currentScreen = document.querySelector(
        ".screen:not(.hidden)"
    );

    if (
        currentScreen &&
        currentScreen !== targetScreen
    ) {
        currentScreen.classList.add("hidden");
    }

    targetScreen.classList.remove("hidden");

    Object.values(transitions).forEach(className => {
        targetScreen.classList.remove(className);
    });

    void targetScreen.offsetWidth;

    targetScreen.classList.add(
        transitions[target] || "transition-menu"
    );

    appState.currentScreen = target;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    if (target === "create") {

        renderCreatedItems();

        setTimeout(() => {

            if (productInput) {
                productInput.focus();
            }

        }, 400);

    }


    if (target === "view") {

        renderPriceItems();

    }


    if (target === "nearby") {

        if (cepInput && !nearbyState.cep) {
            setTimeout(() => cepInput.focus(), 400);
        }

    }
}


/* =========================================================
   ABRIR LISTA
========================================================= */

function openCreateList() {

    switchScreen("create");

}


/* =========================================================
   ABRIR VISUALIZAÇÃO
========================================================= */

function openShoppingList() {

    renderPriceItems();

    switchScreen("view");

}


/* =========================================================
   ABRIR MERCADOS
========================================================= */

function openNearbyMarkets() {

    switchScreen("nearby");

}


/* =========================================================
   LISTA DE COMPRAS
========================================================= */

function setupShoppingList() {

    if (addItemButton) {

        addItemButton.addEventListener(
            "click",
            addShoppingItem
        );

    }


    if (productInput) {

        productInput.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {
                    event.preventDefault();
                    addShoppingItem();
                }

            }
        );

    }


    if (quantityInput) {

        quantityInput.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {
                    event.preventDefault();
                    addShoppingItem();
                }

            }
        );

    }


    if (clearListButton) {

        clearListButton.addEventListener(
            "click",
            requestClearShoppingList
        );

    }
}


/* =========================================================
   ADICIONAR ITEM
========================================================= */

function addShoppingItem() {

    const name = productInput
        ? productInput.value.trim()
        : "";

    const quantityValue = quantityInput
        ? Number(quantityInput.value)
        : 1;

    const quantity = Math.max(
        1,
        Math.floor(quantityValue || 1)
    );


    if (!name) {

        showCreateListMessage(
            "Informe o nome do produto."
        );

        if (productInput) {
            productInput.focus();
        }

        return;
    }


    const item = {
        id: createItemId(),
        name,
        category: appState.selectedCategory,
        quantity,
        unitPrice: 0
    };


    appState.shoppingList.push(item);

    saveShoppingList();

    renderCreatedItems();

    renderPriceItems();

    showCreateListMessage(
        "Produto adicionado à lista.",
        true
    );


    if (productInput) {
        productInput.value = "";
        productInput.focus();
    }

    if (quantityInput) {
        quantityInput.value = "1";
    }


    showTemporaryMessage(
        `${name} foi adicionado à lista.`
    );
}


/* =========================================================
   ID DOS ITENS
========================================================= */

function createItemId() {

    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

}


/* =========================================================
   RENDER LISTA CRIADA
========================================================= */

function renderCreatedItems() {

    if (!createdItemsList) {
        return;
    }

    createdItemsList.innerHTML = "";

    const items = appState.shoppingList;

    if (createListCount) {
        createListCount.textContent = items.length;
    }


    if (items.length === 0) {

        if (createdListEmpty) {
            createdListEmpty.classList.remove("hidden");
        }

        if (clearListButton) {
            clearListButton.classList.add("hidden");
        }

        return;
    }


    if (createdListEmpty) {
        createdListEmpty.classList.add("hidden");
    }

    if (clearListButton) {
        clearListButton.classList.remove("hidden");
    }


    items.forEach((item, index) => {

        const article = document.createElement("article");

        article.className = "created-item";

        article.style.animationDelay = `${index * 0.035}s`;


        const icon = categoryMap[item.category] || categoryMap.Outros;


        article.innerHTML = `
            <div class="item-main">

                <div class="item-category-icon">
                    <i class="fa-solid ${icon}"></i>
                </div>

                <div class="item-category-info">

                    <span class="category-label">
                        ${escapeHTML(item.category)}
                    </span>

                    <h4>
                        ${escapeHTML(item.name)}
                    </h4>

                    <div class="item-quantity">
                        Quantidade: ${formatQuantity(item.quantity)}
                    </div>

                </div>

            </div>

            <button
                class="remove-item-button"
                type="button"
                aria-label="Remover ${escapeHTML(item.name)}"
                data-remove-id="${item.id}"
            >
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;


        const removeButton = article.querySelector(
            "[data-remove-id]"
        );


        if (removeButton) {

            removeButton.addEventListener(
                "click",
                () => requestRemoveItem(item.id)
            );

        }


        createdItemsList.appendChild(article);

    });
}


/* =========================================================
   REMOVER ITEM
========================================================= */

function requestRemoveItem(itemId) {

    const item = appState.shoppingList.find(
        currentItem => currentItem.id === itemId
    );

    if (!item) {
        return;
    }


    openConfirmModal({

        title: "Remover produto?",

        message:
            `O produto "${item.name}" será removido da sua lista.`,

        confirmText: "Remover",

        cancelText: "Cancelar",

        icon: "fa-trash-can",

        onConfirm: () => {

            appState.shoppingList =
                appState.shoppingList.filter(
                    currentItem => currentItem.id !== itemId
                );

            saveShoppingList();

            renderCreatedItems();

            renderPriceItems();

            showTemporaryMessage(
                "Produto removido da lista."
            );

        }

    });

}


/* =========================================================
   SOLICITAR EXCLUSÃO DA LISTA
========================================================= */

function requestClearShoppingList() {

    if (appState.shoppingList.length === 0) {

        showTemporaryMessage(
            "Sua lista já está vazia."
        );

        return;
    }


    openConfirmModal({

        title: "Excluir lista?",

        message:
            "Todos os itens e preços cadastrados serão removidos. Essa ação não pode ser desfeita.",

        confirmText: "Excluir lista",

        cancelText: "Cancelar",

        icon: "fa-trash-can",

        onConfirm: clearShoppingList

    });

}


/* =========================================================
   EXCLUIR LISTA
========================================================= */

function clearShoppingList() {

    appState.shoppingList = [];

    saveShoppingList();

    renderCreatedItems();

    renderPriceItems();

    showTemporaryMessage(
        "Lista de compras excluída."
    );

}


/* =========================================================
   RENDER PREÇOS
========================================================= */

function renderPriceItems() {

    if (!priceItemsList) {
        return;
    }

    priceItemsList.innerHTML = "";


    const items = appState.shoppingList;


    if (viewListCount) {
        viewListCount.textContent = items.length;
    }


    if (items.length === 0) {

        if (priceListEmpty) {
            priceListEmpty.classList.remove("hidden");
        }

        updateGrandTotal();

        return;
    }


    if (priceListEmpty) {
        priceListEmpty.classList.add("hidden");
    }


    items.forEach((item, index) => {

        const article = document.createElement("article");

        article.className = "price-item";

        article.style.animationDelay =
            `${index * 0.035}s`;


        const icon =
            categoryMap[item.category] ||
            categoryMap.Outros;


        const total =
            Number(item.quantity || 1) *
            Number(item.unitPrice || 0);


        article.innerHTML = `
            <div class="price-item-main">

                <div class="price-category-icon">
                    <i class="fa-solid ${icon}"></i>
                </div>

                <div>

                    <span class="category-label">
                        ${escapeHTML(item.category)}
                    </span>

                    <h4>
                        ${escapeHTML(item.name)}
                    </h4>

                    <div class="item-quantity">
                        Quantidade: ${formatQuantity(item.quantity)}
                    </div>

                </div>

            </div>


            <div class="price-entry">

                <label>
                    Preço unitário
                </label>

                <div class="money-input">

                    <span>
                        R$
                    </span>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        value="${formatInputPrice(item.unitPrice)}"
                        data-price-id="${item.id}"
                        aria-label="Preço unitário de ${escapeHTML(item.name)}"
                    >

                </div>

                <strong
                    class="item-total"
                    data-total-id="${item.id}"
                >
                    ${formatCurrency(total)}
                </strong>

            </div>
        `;


        const priceInput = article.querySelector(
            `[data-price-id="${item.id}"]`
        );


        if (priceInput) {

            priceInput.addEventListener(
                "input",
                event => {

                    updateItemPrice(
                        item.id,
                        event.target.value
                    );

                }
            );

        }


        priceItemsList.appendChild(article);

    });


    updateGrandTotal();

}


/* =========================================================
   ATUALIZAR PREÇO
========================================================= */

function updateItemPrice(itemId, rawValue) {

    const item = appState.shoppingList.find(
        currentItem => currentItem.id === itemId
    );

    if (!item) {
        return;
    }


    let value = String(rawValue)
        .replace(",", ".")
        .replace(/[^\d.]/g, "");


    const parsed = Number(value);


    item.unitPrice =
        Number.isFinite(parsed) && parsed >= 0
            ? parsed
            : 0;


    const itemTotal =
        item.quantity * item.unitPrice;


    const totalElement =
        document.querySelector(
            `[data-total-id="${item.id}"]`
        );


    if (totalElement) {

        totalElement.textContent =
            formatCurrency(itemTotal);

    }


    updateGrandTotal();

    saveShoppingList();

}


/* =========================================================
   TOTAL GERAL
========================================================= */

function updateGrandTotal() {

    const total = appState.shoppingList.reduce(
        (sum, item) => {

            return sum +
                Number(item.quantity || 0) *
                Number(item.unitPrice || 0);

        },
        0
    );


    if (grandTotal) {
        grandTotal.textContent =
            formatCurrency(total);
    }
}


/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatCurrency(value) {

    return currencyFormatter.format(
        Number(value) || 0
    );

}


function formatInputPrice(value) {

    const number = Number(value);

    if (!Number.isFinite(number) || number <= 0) {
        return "";
    }

    return number.toFixed(2);

}


function formatQuantity(value) {

    const quantity = Number(value) || 1;

    return quantity.toLocaleString("pt-BR");

}


/* =========================================================
   CATEGORIA
========================================================= */

function setupCategorySelect() {

    if (!categoryListboxButton) {
        return;
    }


    categoryListboxButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            toggleCategorySelect();

        }
    );


    if (categoryOptions) {

        const options =
            categoryOptions.querySelectorAll(
                ".category-option"
            );


        options.forEach(option => {

            option.addEventListener(
                "click",
                () => {

                    selectCategory(
                        option.dataset.value,
                        option.dataset.icon
                    );

                }
            );

        });

    }


    document.addEventListener(
        "click",
        event => {

            if (
                categorySelect &&
                !categorySelect.contains(event.target)
            ) {

                closeCategorySelect();

            }

        }
    );

}


function toggleCategorySelect() {

    if (!categorySelect) {
        return;
    }

    const open =
        categorySelect.classList.toggle("open");

    categoryListboxButton.setAttribute(
        "aria-expanded",
        String(open)
    );

}


function closeCategorySelect() {

    if (!categorySelect) {
        return;
    }

    categorySelect.classList.remove("open");

    categoryListboxButton.setAttribute(
        "aria-expanded",
        "false"
    );

}


function selectCategory(category, iconClass) {

    appState.selectedCategory =
        category || "Mercearia";


    if (categorySelectedLabel) {
        categorySelectedLabel.textContent =
            appState.selectedCategory;
    }


    const selectedIcon =
        document.querySelector(
            ".category-selected-icon i"
        );


    if (selectedIcon) {

        selectedIcon.className =
            `fa-solid ${iconClass || categoryMap[appState.selectedCategory]}`;

    }


    const options =
        categoryOptions
            ? categoryOptions.querySelectorAll(
                ".category-option"
            )
            : [];


    options.forEach(option => {

        const isSelected =
            option.dataset.value ===
            appState.selectedCategory;

        option.classList.toggle(
            "selected",
            isSelected
        );

        option.setAttribute(
            "aria-selected",
            String(isSelected)
        );

    });


    closeCategorySelect();

}


/* =========================================================
   CEP
========================================================= */

function setupNearbyMarkets() {

    if (cepInput) {

        cepInput.addEventListener(
            "input",
            event => {

                event.target.value =
                    formatCEP(event.target.value);

                clearCEPMessage();

            }
        );


        cepInput.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    searchMarketsByCEP();

                }

            }
        );

    }


    if (searchMarketsButton) {

        searchMarketsButton.addEventListener(
            "click",
            searchMarketsByCEP
        );

    }


    if (retryMarketsButton) {

        retryMarketsButton.addEventListener(
            "click",
            searchMarketsByCEP
        );

    }


    if (changeCepButton) {

        changeCepButton.addEventListener(
            "click",
            () => {

                if (locatedAddressCard) {
                    locatedAddressCard.classList.add(
                        "hidden"
                    );
                }

                if (cepInput) {

                    cepInput.focus();

                    cepInput.select();

                }

            }
        );

    }

}


/* =========================================================
   FORMATAR CEP
========================================================= */

function formatCEP(value) {

    const digits =
        String(value || "")
            .replace(/\D/g, "")
            .slice(0, 8);


    if (digits.length <= 5) {
        return digits;
    }


    return `${digits.slice(0, 5)}-${digits.slice(5)}`;

}


/* =========================================================
   VALIDAR CEP
========================================================= */

function isValidCEP(cep) {

    return /^\d{5}-?\d{3}$/.test(
        String(cep || "")
    );

}


/* =========================================================
   LIMPAR VISUAL DE MERCADOS
========================================================= */

function resetMarketsView() {

    if (marketsResults) {
        marketsResults.classList.add("hidden");
    }

    if (marketsEmpty) {
        marketsEmpty.classList.add("hidden");
    }

    if (marketsError) {
        marketsError.classList.add("hidden");
    }

    if (marketsLoading) {
        marketsLoading.classList.add("hidden");
    }

    if (marketsList) {
        marketsList.innerHTML = "";
    }

}


/* =========================================================
   LOADING MERCADOS
========================================================= */

function showMarketsLoading() {

    resetMarketsView();

    if (marketsLoading) {
        marketsLoading.classList.remove("hidden");
    }

}


/* =========================================================
   MENSAGEM CEP
========================================================= */

function clearCEPMessage() {

    if (cepMessage) {
        cepMessage.textContent = "";
    }

}


function showCEPMessage(message) {

    if (cepMessage) {
        cepMessage.textContent = message;
    }

}


/* =========================================================
   BUSCAR ENDEREÇO PELO CEP
========================================================= */

async function fetchAddressByCEP(cep) {

    const cleanCEP =
        cep.replace(/\D/g, "");


    const response =
        await fetch(
            `${CONFIG.viaCepUrl}/${cleanCEP}/json/`
        );


    if (!response.ok) {
        throw new Error(
            "Não foi possível consultar o CEP."
        );
    }


    const data =
        await response.json();


    if (data.erro) {
        throw new Error(
            "CEP não encontrado."
        );
    }


    return data;

}


/* =========================================================
   MONTAR ENDEREÇO
========================================================= */

function buildGeocodingAddress(addressData) {

    const parts = [
        addressData.logradouro,
        addressData.bairro,
        addressData.localidade,
        addressData.uf,
        "Brasil"
    ].filter(Boolean);


    return parts.join(", ");

}


/* =========================================================
   GEOCODIFICAR
========================================================= */

async function geocodeAddress(address) {

    const params = new URLSearchParams({

        q: address,

        format: "json",

        limit: "1",

        countrycodes: "br",

        addressdetails: "1"

    });


    const response =
        await fetch(
            `${CONFIG.nominatimUrl}?${params.toString()}`,
            {
                headers: {
                    "Accept": "application/json",
                    "Accept-Language": "pt-BR"
                }
            }
        );


    if (!response.ok) {
        throw new Error(
            "Não foi possível localizar o endereço."
        );
    }


    const data =
        await response.json();


    if (!Array.isArray(data) || data.length === 0) {

        throw new Error(
            "Não foi possível localizar esse endereço no mapa."
        );

    }


    return {

        latitude: Number(data[0].lat),

        longitude: Number(data[0].lon),

        displayName:
            data[0].display_name || address

    };

}


/* =========================================================
   BUSCAR MERCADOS NO OVERPASS
========================================================= */

async function fetchNearbyMarkets(
    latitude,
    longitude
) {

    const radius =
        CONFIG.marketSearchRadius;


    const query = `
        [out:json][timeout:25];

        (
            nwr(
                around:${radius},
                ${latitude},
                ${longitude}
            )["shop"="supermarket"];

            nwr(
                around:${radius},
                ${latitude},
                ${longitude}
            )["shop"="convenience"];

            nwr(
                around:${radius},
                ${latitude},
                ${longitude}
            )["shop"="grocery"];

            nwr(
                around:${radius},
                ${latitude},
                ${longitude}
            )["shop"="department_store"];
        );

        out center tags;
    `;


    let lastError = null;


    for (
        const overpassUrl of CONFIG.overpassUrls
    ) {

        try {

            const response =
                await fetch(
                    `${overpassUrl}?data=${encodeURIComponent(query)}`
                );


            if (!response.ok) {

                throw new Error(
                    "Servidor de mapas indisponível."
                );

            }


            const data =
                await response.json();


            return Array.isArray(data.elements)
                ? data.elements
                : [];

        }

        catch (error) {

            lastError = error;

        }

    }


    throw (
        lastError ||
        new Error(
            "Não foi possível consultar os mercados."
        )
    );

}


/* =========================================================
   NORMALIZAR MERCADO
========================================================= */

function normalizeMarket(
    element,
    userLatitude,
    userLongitude
) {

    const tags = element.tags || {};


    const latitude =
        element.lat ??
        element.center?.lat;


    const longitude =
        element.lon ??
        element.center?.lon;


    if (
        !Number.isFinite(Number(latitude)) ||
        !Number.isFinite(Number(longitude))
    ) {

        return null;

    }


    const distance =
        calculateDistance(
            userLatitude,
            userLongitude,
            Number(latitude),
            Number(longitude)
        );


    return {

        id:
            element.id
                ? `${element.type}-${element.id}`
                : `${latitude}-${longitude}`,

        name:
            tags.name ||
            tags.brand ||
            tags.operator ||
            "Mercado próximo",

        latitude: Number(latitude),

        longitude: Number(longitude),

        distance,

        address:
            buildMarketAddress(tags),

        shopType:
            tags.shop || ""

    };

}


/* =========================================================
   ENDEREÇO DO MERCADO
========================================================= */

function buildMarketAddress(tags) {

    const parts = [];


    if (tags["addr:street"]) {

        let street =
            tags["addr:street"];


        if (tags["addr:housenumber"]) {

            street +=
                `, ${tags["addr:housenumber"]}`;

        }


        parts.push(street);

    }


    if (tags["addr:suburb"]) {
        parts.push(tags["addr:suburb"]);
    }


    if (tags["addr:city"]) {
        parts.push(tags["addr:city"]);
    }


    return parts.join(" • ") ||
        "Endereço não informado";

}


/* =========================================================
   DISTÂNCIA HAVERSINE
========================================================= */

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const earthRadius = 6371e3;

    const phi1 =
        degreesToRadians(lat1);

    const phi2 =
        degreesToRadians(lat2);

    const deltaPhi =
        degreesToRadians(lat2 - lat1);

    const deltaLambda =
        degreesToRadians(lon2 - lon1);


    const a =
        Math.sin(deltaPhi / 2) ** 2 +
        Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return earthRadius * c;

}


function degreesToRadians(degrees) {

    return degrees * Math.PI / 180;

}


/* =========================================================
   FORMATAR DISTÂNCIA
========================================================= */

function formatDistance(distance) {

    if (distance < 1000) {

        return `${Math.round(distance)} m`;

    }


    return `${(
        distance / 1000
    ).toFixed(1).replace(".", ",")} km`;

}


/* =========================================================
   LINK GOOGLE MAPS
========================================================= */

function buildGoogleMapsLink(
    latitude,
    longitude
) {

    return (
        "https://www.google.com/maps/dir/?api=1" +
        `&destination=${encodeURIComponent(
            `${latitude},${longitude}`
        )}`
    );

}


/* =========================================================
   RENDER MERCADOS
========================================================= */

function renderNearbyMarkets(markets) {

    if (!marketsList) {
        return;
    }


    marketsList.innerHTML = "";


    if (!markets.length) {

        if (marketsEmpty) {
            marketsEmpty.classList.remove("hidden");
        }

        return;
    }


    if (marketsResults) {
        marketsResults.classList.remove("hidden");
    }


    if (marketsCount) {
        marketsCount.textContent =
            markets.length;
    }


    markets.forEach((market, index) => {

        const article =
            document.createElement("article");


        article.className = "market-item";

        article.style.animationDelay =
            `${index * 0.035}s`;


        article.innerHTML = `

            <div class="market-main">

                <div class="market-icon">
                    <i class="fa-solid fa-store"></i>
                </div>

                <div class="market-info">

                    <h4>
                        ${escapeHTML(market.name)}
                    </h4>

                    <div class="market-distance">

                        <i class="fa-solid fa-location-arrow"></i>

                        ${formatDistance(market.distance)}

                    </div>

                    <div class="market-address">
                        ${escapeHTML(market.address)}
                    </div>

                </div>

            </div>


            <a
                class="route-button"
                href="${buildGoogleMapsLink(
                    market.latitude,
                    market.longitude
                )}"
                target="_blank"
                rel="noopener noreferrer"
            >
                <i class="fa-solid fa-route"></i>
                Rota
            </a>

        `;


        marketsList.appendChild(article);

    });

}


/* =========================================================
   MOSTRAR ENDEREÇO
========================================================= */

function showLocatedAddress(address) {

    if (!locatedAddressCard) {
        return;
    }


    locatedAddressCard.classList.remove(
        "hidden"
    );


    if (locatedAddress) {
        locatedAddress.textContent = address;
    }

}


/* =========================================================
   BUSCAR MERCADOS PELO CEP
========================================================= */

async function searchMarketsByCEP() {

    const cep =
        cepInput
            ? cepInput.value.trim()
            : "";


    if (!isValidCEP(cep)) {

        showCEPMessage(
            "Digite um CEP válido no formato 00000-000."
        );

        if (cepInput) {
            cepInput.focus();
        }

        return;
    }


    nearbyState.cep = cep;

    showMarketsLoading();


    try {

        const addressData =
            await fetchAddressByCEP(cep);


        const address =
            buildGeocodingAddress(addressData);


        nearbyState.address =
            address;


        const geo =
            await geocodeAddress(address);


        nearbyState.latitude =
            geo.latitude;

        nearbyState.longitude =
            geo.longitude;


        showLocatedAddress(
            geo.displayName
        );


        const elements =
            await fetchNearbyMarkets(
                geo.latitude,
                geo.longitude
            );


        const markets =
            elements
                .map(element =>
                    normalizeMarket(
                        element,
                        geo.latitude,
                        geo.longitude
                    )
                )
                .filter(Boolean)
                .sort(
                    (a, b) =>
                        a.distance - b.distance
                )
                .filter(
                    (market, index, array) =>
                        index === array.findIndex(
                            other =>
                                other.name.toLowerCase() ===
                                market.name.toLowerCase() &&
                                Math.abs(
                                    other.latitude -
                                    market.latitude
                                ) < 0.0002 &&
                                Math.abs(
                                    other.longitude -
                                    market.longitude
                                ) < 0.0002
                        )
                )
                .slice(0, CONFIG.maxMarkets);


        nearbyState.markets =
            markets;


        if (marketsLoading) {
            marketsLoading.classList.add(
                "hidden"
            );
        }


        if (marketsError) {
            marketsError.classList.add(
                "hidden"
            );
        }


        if (markets.length === 0) {

            if (marketsResults) {
                marketsResults.classList.add(
                    "hidden"
                );
            }

            if (marketsEmpty) {
                marketsEmpty.classList.remove(
                    "hidden"
                );
            }

            return;
        }


        renderNearbyMarkets(markets);

    }

    catch (error) {

        console.error(
            "Erro na busca de mercados:",
            error
        );


        if (marketsLoading) {
            marketsLoading.classList.add(
                "hidden"
            );
        }


        if (marketsResults) {
            marketsResults.classList.add(
                "hidden"
            );
        }


        if (marketsEmpty) {
            marketsEmpty.classList.add(
                "hidden"
            );
        }


        if (marketsError) {

            marketsError.classList.remove(
                "hidden"
            );

        }


        if (marketsErrorText) {

            marketsErrorText.textContent =
                error.message ||
                "Não foi possível concluir a busca. Tente novamente.";

        }

    }

}


/* =========================================================
   MODAL DE CONFIRMAÇÃO
========================================================= */

function setupConfirmModal() {

    if (!confirmModal) {
        return;
    }


    if (confirmModalClose) {

        confirmModalClose.addEventListener(
            "click",
            () => closeConfirmModal(true)
        );

    }


    if (confirmModalCancel) {

        confirmModalCancel.addEventListener(
            "click",
            () => closeConfirmModal(true)
        );

    }


    if (confirmModalConfirm) {

        confirmModalConfirm.addEventListener(
            "click",
            handleConfirmModalConfirm
        );

    }


    confirmModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                confirmModal
            ) {

                closeConfirmModal(true);

            }

        }
    );

}


/* =========================================================
   ABRIR MODAL
========================================================= */

function openConfirmModal({

    title = "Tem certeza?",

    message = "",

    confirmText = "Confirmar",

    cancelText = "Cancelar",

    icon = "fa-circle-question",

    danger = true,

    onConfirm = null,

    onCancel = null

} = {}) {


    if (!confirmModal) {
        return;
    }


    confirmModalState.onConfirm =
        typeof onConfirm === "function"
            ? onConfirm
            : null;


    confirmModalState.onCancel =
        typeof onCancel === "function"
            ? onCancel
            : null;


    if (confirmModalTitle) {
        confirmModalTitle.textContent =
            title;
    }


    if (confirmModalMessage) {
        confirmModalMessage.textContent =
            message;
    }


    if (confirmModalConfirm) {

        confirmModalConfirm.textContent =
            confirmText;

    }


    if (confirmModalCancel) {

        confirmModalCancel.textContent =
            cancelText;

    }


    if (confirmModalIcon) {

        confirmModalIcon.className =
            `fa-solid ${icon}`;

    }


    if (confirmModalIconWrapper) {

        confirmModalIconWrapper.style.color =
            danger
                ? "var(--danger)"
                : "var(--green-700)";

        confirmModalIconWrapper.style.background =
            danger
                ? "rgba(217, 75, 75, 0.09)"
                : "rgba(24, 181, 106, 0.09)";

    }


    if (confirmModalKicker) {

        confirmModalKicker.style.color =
            danger
                ? "var(--danger)"
                : "var(--green-600)";

    }


    confirmModal.classList.remove(
        "hidden"
    );


    document.body.classList.add(
        "modal-open"
    );


    setTimeout(() => {

        if (confirmModalCancel) {

            confirmModalCancel.focus();

        }

    }, 80);

}


/* =========================================================
   CONFIRMAR MODAL
========================================================= */

function handleConfirmModalConfirm() {

    const callback =
        confirmModalState.onConfirm;


    closeConfirmModal(false);


    if (callback) {

        try {

            callback();

        }

        catch (error) {

            console.error(
                "Erro ao executar confirmação:",
                error
            );

        }

    }

}


/* =========================================================
   FECHAR MODAL
========================================================= */

function closeConfirmModal(
    executeCancel = false
) {

    if (!confirmModal) {
        return;
    }


    const cancelCallback =
        confirmModalState.onCancel;


    confirmModal.classList.add(
        "hidden"
    );


    document.body.classList.remove(
        "modal-open"
    );


    confirmModalState.onConfirm = null;
    confirmModalState.onCancel = null;


    if (
        executeCancel &&
        cancelCallback
    ) {

        try {

            cancelCallback();

        }

        catch (error) {

            console.error(
                "Erro no cancelamento:",
                error
            );

        }

    }

}


/* =========================================================
   DESCONECTAR
========================================================= */

function requestDisconnect() {

    openConfirmModal({

        title: "Desconectar?",

        message:
            "Tem certeza de que deseja sair do Mercado Fácil e voltar para a tela inicial?",

        confirmText: "Desconectar",

        cancelText: "Cancelar",

        icon: "fa-right-from-bracket",

        onConfirm: disconnectUser

    });

}


/* =========================================================
   EXECUTAR DESCONEXÃO
========================================================= */

function disconnectUser() {

    closeCategorySelect();

    resetMarketsView();

    appState.currentScreen =
        "splash";


    [
        menuScreen,
        createListScreen,
        viewListScreen,
        nearbyMarketsScreen
    ].forEach(screen => {

        if (screen) {
            screen.classList.add("hidden");
        }

    });


    if (splashScreen) {

        splashScreen.classList.remove(
            "hidden"
        );

        splashScreen.classList.remove(
            "transition-menu"
        );

        void splashScreen.offsetWidth;

        splashScreen.classList.add(
            "transition-menu"
        );

    }


    if (cepInput) {
        cepInput.value = "";
    }


    nearbyState.cep = "";
    nearbyState.address = "";
    nearbyState.latitude = null;
    nearbyState.longitude = null;
    nearbyState.markets = [];


    if (locatedAddressCard) {

        locatedAddressCard.classList.add(
            "hidden"
        );

    }


    showTemporaryMessage(
        "Você foi desconectado."
    );

}


/* =========================================================
   TOAST
========================================================= */

function showTemporaryMessage(
    message,
    success = true
) {

    if (!toast || !toastMessage) {
        return;
    }


    clearTimeout(toastTimer);


    toastMessage.textContent =
        message;


    if (toastIcon) {

        toastIcon.className =
            success
                ? "fa-solid fa-circle-check"
                : "fa-solid fa-circle-exclamation";

        toastIcon.style.color =
            success
                ? "var(--green-600)"
                : "var(--danger)";

    }


    toast.classList.remove(
        "hidden"
    );


    toastTimer = setTimeout(() => {

        toast.classList.add(
            "hidden"
        );

    }, 3000);

}


/* =========================================================
   MENSAGEM DO FORMULÁRIO
========================================================= */

function showCreateListMessage(
    message,
    success = false
) {

    if (!createListMessage) {
        return;
    }


    createListMessage.textContent =
        message;


    createListMessage.style.color =
        success
            ? "var(--green-600)"
            : "var(--danger)";


    clearTimeout(
        showCreateListMessage.timer
    );


    showCreateListMessage.timer =
        setTimeout(() => {

            createListMessage.textContent =
                "";

        }, 2500);

}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function saveShoppingList() {

    try {

        localStorage.setItem(
            CONFIG.storageKey,
            JSON.stringify(
                appState.shoppingList
            )
        );

    }

    catch (error) {

        console.warn(
            "Não foi possível salvar a lista:",
            error
        );

    }

}


/* =========================================================
   CARREGAR LISTA
========================================================= */

function loadShoppingList() {

    try {

        const saved =
            localStorage.getItem(
                CONFIG.storageKey
            );


        if (!saved) {
            return;
        }


        const parsed =
            JSON.parse(saved);


        if (!Array.isArray(parsed)) {
            return;
        }


        appState.shoppingList =
            parsed
                .filter(item =>
                    item &&
                    typeof item.name === "string"
                )
                .map(item => ({

                    id:
                        item.id ||
                        createItemId(),

                    name:
                        item.name.trim(),

                    category:
                        categoryMap[item.category]
                            ? item.category
                            : "Outros",

                    quantity:
                        Math.max(
                            1,
                            Number(item.quantity) || 1
                        ),

                    unitPrice:
                        Math.max(
                            0,
                            Number(item.unitPrice) || 0
                        )

                }));

    }

    catch (error) {

        console.warn(
            "Não foi possível carregar a lista:",
            error
        );

        appState.shoppingList = [];

    }

}


/* =========================================================
   TECLADO
========================================================= */

function setupKeyboardShortcuts() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                confirmModal &&
                !confirmModal.classList.contains(
                    "hidden"
                )
            ) {

                closeConfirmModal(true);

                return;
            }


            if (
                event.key === "Escape" &&
                categorySelect &&
                categorySelect.classList.contains(
                    "open"
                )
            ) {

                closeCategorySelect();

            }

        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   INICIALIZAÇÃO FINAL
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();

}
