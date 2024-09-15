let cards = [];
let hiddenCards = [];
let isDragging = false;
let startY, startX;
let currentOffsetY = 0;
let currentOffsetX = 0;

// 初始化 LeanCloud
AV.init({
    appId: "koMYT2W8n45Q0RRL3DYrNhXr-gzGzoHsz",
    appKey: "McDZQRh7Te30QlAcy8CCn395",
    serverURL: "https://komyt2w8.lc-cn-n1-shared.com/",
    disableCurrentUser: true,
    appRouter: null
});
console.log('LeanCloud initialized'); // 添加日志

function getRandomColor() {
    const colors = [
        '#FFD3B6', '#DCEDC1', '#A8E6CF', '#FF8B94', '#FFDAC1',
        '#E2F0CB', '#B5EAD7', '#C7CEEA', '#FF9AA2', '#F6E3C5'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

let longPressTimer;
const longPressDuration = 500; // 长按时间阈值（毫秒）

function createCard(content, time) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.backgroundColor = getRandomColor();
    card.innerHTML = `
        <div class="card-content">${content}</div>
        <div class="card-time">${time || new Date().toLocaleString()}</div>
    `;
    
    const deleteButton = document.createElement('div');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = '×';
    deleteButton.style.display = 'none';
    card.appendChild(deleteButton);
    
    card.addEventListener('mousedown', (e) => startLongPress(e, card));
    card.addEventListener('mouseup', cancelLongPress);
    card.addEventListener('mouseleave', cancelLongPress);
    card.addEventListener('touchstart', (e) => startLongPress(e, card));
    card.addEventListener('touchend', cancelLongPress);
    card.addEventListener('touchcancel', cancelLongPress);
    
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCardWithAuth(card);
    });
    
    return card;
}

function startLongPress(e, card) {
    longPressTimer = setTimeout(() => {
        showDeleteButton(card);
    }, longPressDuration);
}

function cancelLongPress() {
    clearTimeout(longPressTimer);
}

function showDeleteButton(card) {
    const deleteButton = card.querySelector('.delete-button');
    deleteButton.style.display = 'block';
    setTimeout(() => {
        deleteButton.style.display = 'none';
    }, 3000); // 3秒后隐藏删除按钮
}

async function deleteCardWithAuth(card) {
    try {
        let user = await checkAuthCookie();
        if (!user) {
            const username = prompt('请输入用户名：');
            const password = prompt('请输入密码：');
            
            try {
                user = await AV.User.logIn(username, password);
                console.log('登录成功');
                saveAuthCookie(username, password);
            } catch (error) {
                console.error('登录失败:', error);
                alert('登录失败，无法删除卡片');
                return;
            }
        }
        await deleteCard(card, user);
    } catch (error) {
        console.error('删除卡片过程中出错:', error);
        alert('删除卡片失败，请稍后再试');
    }
}

function saveAuthCookie(username, password) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 设置 cookie 有效期为 7 天
    document.cookie = `auth_username=${username}; expires=${expirationDate.toUTCString()}; path=/`;
    document.cookie = `auth_password=${password}; expires=${expirationDate.toUTCString()}; path=/`;
}

function getAuthCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

async function checkAuthCookie() {
    const username = getAuthCookie('auth_username');
    const password = getAuthCookie('auth_password');
    if (username && password) {
        try {
            const user = await AV.User.logIn(username, password);
            console.log('用户自动登录成功');
            return user;
        } catch (error) {
            console.error('自动登录失败:', error);
            return null;
        }
    }
    return null;
}

async function deleteCard(card, user) {
    const index = cards.indexOf(card);
    if (index > -1) {
        try {
            console.log('尝试删除卡片:', card.querySelector('.card-content').textContent);
            
            // 从 LeanCloud 删除数据
            const query = new AV.Query('Card');
            query.equalTo('content', card.querySelector('.card-content').textContent);
            query.equalTo('time', card.querySelector('.card-time').textContent);
            const cardObject = await query.first();
            if (cardObject) {
                console.log('在 LeanCloud 中找到卡片，尝试删除');
                await cardObject.destroy({ user: user });
                console.log('卡片已从 LeanCloud 成功删除');
            } else {
                console.log('在 LeanCloud 中未找到卡片');
            }

            // 从 DOM 和本地数组中删除卡片
            cards.splice(index, 1);
            card.remove();
            updateCardPositions();

            // 从本地存储中删除卡片
            let storedCards = loadCardsFromLocalStorage();
            storedCards = storedCards.filter(storedCard => 
                storedCard.content !== card.querySelector('.card-content').textContent ||
                storedCard.time !== card.querySelector('.card-time').textContent
            );
            saveCardsToLocalStorage(storedCards);

            console.log('卡片已在本地删除');
        } catch (error) {
            console.error('删除卡片失败:', error);
            console.error('错误详情:', error.message);
            if (error.code) {
                console.error('LeanCloud 错误代码:', error.code);
            }
            throw error;
        }
    }
}

function saveCookie(role, password) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 设置 cookie 有效期为 7 天
    document.cookie = `role=${role}; expires=${expirationDate.toUTCString()}; path=/`;
    document.cookie = `password=${password}; expires=${expirationDate.toUTCString()}; path=/`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

async function checkAuthentication() {
    const role = getCookie('role');
    const password = getCookie('password');
    if (role && password) {
        try {
            const user = await AV.User.logIn(role, password);
            console.log('用户自动登录成功');
            return true;
        } catch (error) {
            console.error('自动登录失败:', error);
            return false;
        }
    }
    return false;
}

let lastSendTime = 0;
const sendCooldown = 3000; // 3秒冷却时间
let dailySendCount = 0;
const maxDailySendCount = 100;

// 获取用户IP地址的函数（需要服务器支持）
async function getUserIP() {
    try {
        const response = await fetch('http://api.ipify.cn?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('获取IP地址失败:', error);
        return null;
    }
}

// 检查用户今日发送次数
async function checkDailySendCount() {
    const ip = await getUserIP();
    if (!ip) return false;

    const today = new Date().toDateString();
    const key = `sendCount_${ip}_${today}`;
    
    const countQuery = new AV.Query('DailySendCount');
    countQuery.equalTo('key', key);
    const countObject = await countQuery.first();

    if (countObject) {
        dailySendCount = countObject.get('count');
        return dailySendCount < maxDailySendCount;
    } else {
        dailySendCount = 0;
        return true;
    }
}

// 更新用户今日发送次数
async function updateDailySendCount() {
    const ip = await getUserIP();
    if (!ip) return;

    const today = new Date().toDateString();
    const key = `sendCount_${ip}_${today}`;
    
    const DailySendCount = AV.Object.extend('DailySendCount');
    const countQuery = new AV.Query(DailySendCount);
    countQuery.equalTo('key', key);
    let countObject = await countQuery.first();

    if (countObject) {
        countObject.increment('count');
    } else {
        countObject = new DailySendCount();
        countObject.set('key', key);
        countObject.set('count', 1);
    }

    await countObject.save();
    dailySendCount++;
}

async function addCard() {
    const currentTime = Date.now();
    if (currentTime - lastSendTime < sendCooldown) {
        alert('请等待3秒后再发送下一个卡片');
        return;
    }

    if (!(await checkDailySendCount())) {
        alert('您今天已达到发送上限（100个卡片）');
        return;
    }

    const input = document.getElementById('wish-input');
    const content = input.value.trim();
    if (content) {
        try {
            // 创建 LeanCloud 对象并保存
            const Card = AV.Object.extend('Card');
            const card = new Card();
            card.set('content', content);
            card.set('time', new Date().toLocaleString());
            
            // 设置 ACL
            const acl = new AV.ACL();
            acl.setPublicReadAccess(true);
            acl.setPublicWriteAccess(true);
            card.setACL(acl);
            
            await card.save();

            // 创建并显示卡片
            const cardElement = createCard(content, card.get('time'));
            document.getElementById('card-container').prepend(cardElement);
            cards.unshift(cardElement);
            updateCardPositions();
            launchRocket(); // 在成功添加卡片后触发火箭动画
            input.value = '';
            console.log('Card added successfully'); // 添加日志

            // 更新本地存储
            let storedCards = loadCardsFromLocalStorage();
            storedCards.unshift({content: content, time: card.get('time')});
            saveCardsToLocalStorage(storedCards);

            // 更新发送时间和计数
            lastSendTime = currentTime;
            await updateDailySendCount();
        } catch (error) {
            console.error('保存卡片失败:', error);
        }
    } else {
        console.log('No content to add'); // 添加日志
    }
}

function updateCardPositions() {
    cards.forEach((card, index) => {
        const offset = index * 40; // 增加偏移量以显示下层卡片的20%
        const scale = Math.max(0.8, 1 - index * 0.05);
        card.style.transform = `translateY(${offset}px) scale(${scale})`;
        card.style.zIndex = cards.length - index;
    });
}

function hideTopCard() {
    if (cards.length > 0) {
        const hiddenCard = cards.shift();
        hiddenCards.unshift(hiddenCard);
        hiddenCard.style.transform = 'translate(0, -100%) rotateX(90deg)';
        hiddenCard.style.opacity = 0;
        setTimeout(() => {
            hiddenCard.remove();
        }, 500);
        
        updateCardPositions();
        changeBackgroundColor();
        createAppleCelebration();
        checkLoadMore(); // 检查是否需要加载更多卡片
    }
}

function changeBackgroundColor() {
    const colors = ['#FF9500', '#FF2D55', '#5856D6', '#007AFF', '#4CD964', '#FFCC00', '#FF3B30'];
    const color1 = colors[Math.floor(Math.random() * colors.length)];
    const color2 = colors[Math.floor(Math.random() * colors.length)];
    document.getElementById('background').style.background = `linear-gradient(45deg, ${color1}, ${color2})`;
}

function createConfetti() {
    const confettiCount = 150;
    const container = document.body;
    const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#4cd964', '#5ac8fa', '#007aff', '#5856d6', '#ff2d55', '#bf5af2'];
    const shapes = ['circle', 'rectangle', 'triangle', 'star', 'heart'];
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // 随机形状
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        confetti.classList.add(`confetti-${shape}`);
        
        // 随机颜色
        const color = colors[Math.floor(Math.random() * colors.length)];
        if (shape === 'triangle') {
            confetti.style.borderBottomColor = color;
        } else {
            confetti.style.backgroundColor = color;
        }
        
        // 随机大小
        const size = Math.random() * 10 + 5;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        
        // 设置初始位置
        const startX = Math.random() * window.innerWidth;
        const startY = Math.random() * window.innerHeight;
        confetti.style.left = `${startX}px`;
        confetti.style.top = `${startY}px`;
        
        // 随机动画持续时间和延迟
        const duration = Math.random() * 2 + 2;
        const delay = Math.random() * 0.5;
        confetti.style.animationDuration = `${duration}s`;
        confetti.style.animationDelay = `${delay}s`;
        
        // 随机方向和距离
        const angle = Math.random() * Math.PI * 2;
        const spread = Math.random() * 300 + 200;
        const distance = Math.random() * spread;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        const tr = Math.random() * 720 - 360; // 随机旋转
        confetti.style.setProperty('--tx', `${tx}px`);
        confetti.style.setProperty('--ty', `${ty}px`);
        confetti.style.setProperty('--tr', `${tr}deg`);
        
        // 添加摇摆动画
        const sway = Math.random() * 20 - 10;
        confetti.style.setProperty('--sx', `${sway}px`);
        confetti.style.animation += `, confetti-sway ${Math.random() * 2 + 1}s ease-in-out infinite`;
        
        container.appendChild(confetti);
        
        // 动画结束后移除彩带
        confetti.addEventListener('animationend', (e) => {
            if (e.animationName === 'confetti-burst') {
                confetti.remove();
            }
        });
    }
}

function createAppleCelebration() {
    const container = document.body;
    const celebrationCount = 30;
    const colors = ['#007AFF', '#FF2D55', '#5856D6', '#FF9500', '#4CD964', '#FFCC00'];
    const shapes = ['triangle', 'star', 'heart', 'trumpet', 'celebration'];
    
    for (let i = 0; i < celebrationCount; i++) {
        const celebration = document.createElement('div');
        celebration.className = 'apple-celebration';
        
        // 随机形状
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        celebration.classList.add(`celebration-${shape}`);
        
        // 随机颜色
        const color = colors[Math.floor(Math.random() * colors.length)];
        celebration.style.color = color;
        
        // 设置位置
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        celebration.style.left = `${x}%`;
        celebration.style.top = `${y}%`;
        
        // 随机大小
        const size = Math.random() * 20 + 20;
        celebration.style.fontSize = `${size}px`;
        
        // 随机动画延迟
        const delay = Math.random() * 0.5;
        celebration.style.animationDelay = `${delay}s`;
        
        container.appendChild(celebration);
        
        // 动画结束后移除元素
        celebration.addEventListener('animationend', () => {
            celebration.remove();
        });
    }
}

function handleDragStart(e) {
    isDragging = true;
    startY = e.clientY || e.touches[0].clientY;
    startX = e.clientX || e.touches[0].clientX;
}

function handleDragMove(e) {
    if (!isDragging || cards.length === 0) return;
    const currentY = e.clientY || e.touches[0].clientY;
    const currentX = e.clientX || e.touches[0].clientX;
    const deltaY = startY - currentY; // 向上滑动为正
    const deltaX = startX - currentX; // 向左滑动为正
    currentOffsetY = -deltaY * 1.5; // 增加灵敏度
    currentOffsetX = -deltaX * 1.5; // 增加灵敏度
    updateCardPositions();
}

function handleDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    if (Math.abs(currentOffsetY) > window.innerHeight * 0.2 || Math.abs(currentOffsetX) > window.innerWidth * 0.2) {
        hideTopCard();
    }
    currentOffsetY = 0;
    currentOffsetX = 0;
    updateCardPositions();
    checkLoadMore(); // 检查是否需要加载更多卡片
}

let currentPage = 0;
const cardsPerPage = 20;
let isLoading = false;
let allCardsLoaded = false;

// 从本地存储加载卡片
function loadCardsFromLocalStorage() {
    const storedCards = localStorage.getItem('storedCards');
    return storedCards ? JSON.parse(storedCards) : [];
}

// 保存卡片到本地存储
function saveCardsToLocalStorage(cards) {
    localStorage.setItem('storedCards', JSON.stringify(cards));
}

async function loadCards(page = 0) {
    if (isLoading || allCardsLoaded) return;
    isLoading = true;
    try {
        let storedCards = loadCardsFromLocalStorage();
        let results;

        if (storedCards.length > page * cardsPerPage) {
            // 从本地存储加载卡片
            results = storedCards.slice(page * cardsPerPage, (page + 1) * cardsPerPage);
        } else {
            // 从服务器加载新卡片
            const query = new AV.Query('Card');
            query.descending('createdAt');
            query.limit(cardsPerPage);
            query.skip(page * cardsPerPage);
            results = await query.find();

            // 将新卡片添加到本地存储
            storedCards = storedCards.concat(results.map(card => ({
                content: card.get('content'),
                time: card.get('time')
            })));
            saveCardsToLocalStorage(storedCards);
        }

        if (results.length === 0) {
            allCardsLoaded = true;
            return;
        }

        if (page === 0) {
            // 清空现有卡片
            document.getElementById('card-container').innerHTML = '';
            cards = [];
        }

        for (let cardData of results) {
            const content = cardData.get ? cardData.get('content') : cardData.content;
            const time = cardData.get ? cardData.get('time') : cardData.time;
            const card = createCard(content, time);
            document.getElementById('card-container').appendChild(card);
            cards.push(card);
        }
        updateCardPositions();
        console.log(`卡片加载完成，当前页：${page + 1}，总数：${cards.length}`);
        currentPage = page;
    } catch (error) {
        console.error('加载卡片失败:', error);
    } finally {
        isLoading = false;
    }
}

function checkLoadMore() {
    if (cards.length - hiddenCards.length <= 15 && !isLoading) {
        loadCards(currentPage + 1);
    }
}

async function initializeApp() {
    changeBackgroundColor();
    await loadCards(); // 初始加载第一页
    console.log('应用初始化完成');
}

function createNightSky() {
    const nightSky = document.createElement('div');
    nightSky.className = 'night-sky';
    document.body.appendChild(nightSky);
    setTimeout(() => nightSky.style.opacity = '1', 10);
}

function createStars() {
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.width = `${Math.random() * 3 + 1}px`;
        star.style.height = star.style.width;
        document.body.appendChild(star);
    }
}

function createMoon() {
    const moon = document.createElement('div');
    moon.className = 'moon';
    moon.style.left = '80%';
    moon.style.top = '10%';
    document.body.appendChild(moon);
}

function createShootingStar() {
    const star = document.createElement('div');
    star.className = 'shooting-star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = '0';
    document.body.appendChild(star);
    setTimeout(() => star.remove(), 1000);
}

function launchRocket() {
    createNightSky();
    createStars();
    createMoon();

    const rocket = document.createElement('img');
    rocket.className = 'rocket-gif';
    rocket.src = 'imgs/rocket.gif'; // 请替换为实际的GIF文件路径
    document.body.appendChild(rocket);

    const card = document.querySelector('.card');
    const originalTransform = card.style.transform;
    card.style.transition = 'transform 3s cubic-bezier(0.47, 0, 0.745, 0.715)';

    setTimeout(() => {
        card.style.transform = 'translateY(-120vh) scale(0.5) rotate(5deg)';
    }, 600); // 延迟600ms开始卡片动画，与火箭的缓冲期同步

    const shootingStarInterval = setInterval(createShootingStar, 300);

    setTimeout(() => {
        rocket.remove();
        card.style.transform = originalTransform;
        card.style.transition = '';
        document.querySelector('.night-sky').style.opacity = '0';
        clearInterval(shootingStarInterval);
        setTimeout(() => {
            document.querySelectorAll('.star, .moon, .night-sky').forEach(el => el.remove());
        }, 1000);
    }, 3000); // 调整为3秒，与新的动画时间一致
}

// 修改事件监听器
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('send-button').addEventListener('click', addCard);
    document.getElementById('wish-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addCard();
    });
    console.log('事件监听器已添加');
});

document.addEventListener('mousedown', handleDragStart);
document.addEventListener('mousemove', handleDragMove);
document.addEventListener('mouseup', handleDragEnd);
document.addEventListener('touchstart', handleDragStart);
document.addEventListener('touchmove', (e) => {
    e.preventDefault(); // 防止页面滚动
    handleDragMove(e);
}, { passive: false });
document.addEventListener('touchend', handleDragEnd);

// 确保只在窗口加载完成后调用一次 initializeApp
window.addEventListener('load', initializeApp);
// 确保只在窗口加载完成后调用一次 initializeApp
window.addEventListener('load', initializeApp);