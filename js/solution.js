'use strict';

const app = document.querySelector('.app'),
    menu = document.querySelector('.menu'),
    menuBurger = document.querySelector('.burger'),
    menuNew = document.querySelector('.new'),
    menuComments = document.querySelector('.comments'),
    commentsForm = document.querySelectorAll('.comments__form'),
    menuDraw = document.querySelector('.draw'),
    menuUrl = document.querySelector('.menu__url'),
    currentImage = document.querySelector('.current-image'),
    loader = document.querySelector('.image-loader'),
    error = document.querySelector('.error'),
    commentsWrap = document.createElement('div'),
    canvas = document.createElement('canvas');

let connection,
    imageData,
    showComments = {},
    host,
    movedPiece = null,
    minY, minX, maxX, maxY,
    shiftX = 0,
    shiftY = 0,
    url = new URL(`${window.location.href}`),
    paramId = url.searchParams.get('id'); 

currentImage.src = ''; 
menu.dataset.state = 'initial'; 
app.dataset.state = '';
hideElement(menuBurger); 
app.removeChild(document.querySelector('.comments__form')); 

//перемещаем меню
document.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', throttle(drag));
document.addEventListener('mouseup', drop);

function dragStart(event) {
    if (event.target.classList.contains('drag')) {
        movedPiece = event.target.parentElement;
        minX = app.offsetLeft;
        minY = app.offsetTop;
            
        maxX = app.offsetLeft + app.offsetWidth - movedPiece.offsetWidth;
        maxY = app.offsetTop + app.offsetHeight - movedPiece.offsetHeight;
            
        shiftX = event.pageX - event.target.getBoundingClientRect().left - window.pageXOffset;
        shiftY = event.pageY - event.target.getBoundingClientRect().top - window.pageYOffset;
    }
}

function drag(event) {
    if (movedPiece) {
        let x = event.pageX - shiftX;
        let y = event.pageY - shiftY;
        x = Math.min(x, maxX);
        y = Math.min(y, maxY);
        x = Math.max(x, minX);
        y = Math.max(y, minY);
        movedPiece.style.left = x + 'px';
        movedPiece.style.top = y + 'px';
    }
}

function drop(event) {
    if (movedPiece) {
        movedPiece = null;
    }
}

//если меню "съезжает"
function checkMenuLength() {
    if (menu.offsetHeight > 100) {
        menu.style.left = (app.offsetWidth - menu.offsetWidth - 1) + 'px';
    }
}

function checkMenuLengthTick() {
    checkMenuLength();
    window.requestAnimationFrame(checkMenuLengthTick);
}

checkMenuLengthTick();

//открываем файл
menuNew.addEventListener('click', onSelectFiles); 
app.addEventListener('drop', onFilesDrop); 
app.addEventListener('dragover', event => event.preventDefault()); 

function onSelectFiles(event) {
    hideElement(error);
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/jpeg, image/png');
    hideElement(input);
    menu.appendChild(input);

    input.addEventListener('change', event => {
        const file = event.currentTarget.files[0];
        if (currentImage.dataset.load === 'load') {
            removeForm();
            curves = []; 
        }
        sendFile(file);
    });

    input.click();
    menu.removeChild(input);
}

function onFilesDrop(event) {
    event.preventDefault();
    hideElement(error);
    const file = event.dataTransfer.files[0];
    
    if (currentImage.dataset.load === 'load') {
        showElement(error);
        error.lastElementChild.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню';
        removeError();
        return;
    }

    if (file.type === 'image/jpeg' || file.type === 'image/png') {
        sendFile(file);
    } else {
        showElement(error);
    }
}

// загружаем изображение на сервер
function sendFile(file) {
    const formData = new FormData();
    formData.append('title', file.name);
    formData.append('image', file);
    
    showElement(loader);

    fetch(`https://neto-api.herokuapp.com/pic`, {
            body: formData,
            credentials: 'same-origin',
            method: 'POST'
        })
        .then( res => {
            if (200 <= res.status && res.status < 300) {
                return res;
            }
            throw new Error (res.statusText);
        })
        .then(res => res.json())
        .then(res => {
            getFile(res.id);
        })
        .catch(err => {
            console.log(err);
            hideElement(loader);
        });
}

// удаляем формы комментариев при загрузке нового изображения
function removeForm() {
    Array.from(commentsForm).forEach(comment => {comment.remove()});
}

// получаем информацию о файле
function getFile(id) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://neto-api.herokuapp.com/pic/${id}`, false);
    xhr.send();

    imageData = JSON.parse(xhr.responseText);
    host = document.location.href.split('?')[0] + `?id=${imageData.id}`;
    history.pushState(null, null, host);
    wss();  
    currentImage.src = imageData.url;
    menuBurger.style.cssText = ``;
    showMenu();

    currentImage.addEventListener('load', () => {
        hideElement(loader);
        currentImage.dataset.load = 'load';
        createCanvas();
        createWrapforComment();
        updateCommentForm(imageData.comments);
    });
}

//открываем меню
menuBurger.addEventListener('click', showMenu);

function showMenu() {
    menu.dataset.state = 'default';
    Array.from(menu.querySelectorAll('.mode')).forEach(mode => {
        mode.dataset.state = '';
        mode.addEventListener('click', () => {
            if (!mode.classList.contains('new')){
                menu.dataset.state = 'selected';
                mode.dataset.state = 'selected';
            }
            
            if (mode.classList.contains('share')) {
                menuUrl.value = host;
            }
        })
    })
}
 
//Комментарии
//показываем меню "Комментарии"
function showMenuComments() {
    menu.dataset.state = 'default';
    Array.from(menu.querySelectorAll('.mode')).forEach(item => {
        if (item.classList.contains('comments')) {
            menu.dataset.state = 'selected';
            item.dataset.state = 'selected';
        }
    });
}

//показываем/убираем комментарии
const commentsOn = document.querySelector('#comments-on'),
    commentsOff = document.querySelector('#comments-off');

commentsOn.addEventListener('click', () => {
    document.querySelectorAll('.comments__form').forEach(form => form.style.display = '');
});
commentsOff.addEventListener('click', () => {
    document.querySelectorAll('.comments__form').forEach(form => form.style.display = 'none');
});

canvas.addEventListener('click', (event) => {
    hideForms();
    removeForm();
    if (menuComments.dataset.state === 'selected' && commentsOn.checked) {
        const newMessage = createCommentForm(event.offsetX, event.offsetY);
        newMessage.querySelector('.comments__marker-checkbox').checked = true;
        commentsWrap.appendChild(newMessage);
    }
}); 

function createCanvas() {
    const width = getComputedStyle(app.querySelector('.current-image')).width.slice(0, -2);
    const height = getComputedStyle(app.querySelector('.current-image')).height.slice(0, -2);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.display = 'block';
    canvas.style.zIndex = '1';

    commentsWrap.appendChild(canvas);
}

// создаем обертку для комментариев
function createWrapforComment() {
    const width = getComputedStyle(currentImage).width;
    const height = getComputedStyle(currentImage).height;
    commentsWrap.style.cssText = `
        width: ${width};
        height: ${height};
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: block;
    `;
    app.appendChild(commentsWrap);

    // отображаем комментарии (по клику) поверх остальных
    commentsWrap.addEventListener('click', event => {
        if (event.target.closest('.comments__form')) {
            const currentForm = event.target.closest('.comments__form');
            commentsWrap.querySelectorAll('.comments__form').forEach(form => {
                form.style.zIndex = 2;
            });
            currentForm.style.zIndex = 3;
            hideForms(currentForm);
            removeForm(currentForm);
        }
    });
}

//создаем форму для комментариев
function createCommentForm(x, y) {
    const formComment = document.createElement('form');
    formComment.classList.add('comments__form');
    formComment.innerHTML = `
        <span class="comments__marker"></span><input type="checkbox" class="comments__marker-checkbox">
        <div class="comments__body">
            <div class="comment">
                <div class="loader">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <textarea class="comments__input" type="text" placeholder="Напишите ответ..."></textarea>
            <input class="comments__close" type="button" value="Закрыть">
            <input class="comments__submit" type="submit" value="Отправить">
        </div>`;

    //смещение, чтобы маркер встал туда, куда кликнули
    const left = x - 20,
        top = y;

    formComment.style.cssText = `
        top: ${top}px;
        left: ${left}px;
        z-index: 2;
    `;
    formComment.dataset.left = left;
    formComment.dataset.top = top;

    hideElement(formComment.querySelector('.loader').parentElement);

    //кнопка "закрыть"
    formComment.querySelector('.comments__close').addEventListener('click', () => {
        if (formComment.querySelectorAll('.comment').length > 1) {
            formComment.querySelector('.comments__marker-checkbox').checked = false;
        } else {
            formComment.remove();
        }
    });

    // кнопка "отправить"
    formComment.addEventListener('submit', sendMessage);

    function sendMessage(event) {
        event.preventDefault();
        const message = formComment.querySelector('.comments__input').value,
            sendMessage = `message=${encodeURIComponent(message)}&left=${encodeURIComponent(left)}&top=${encodeURIComponent(top)}`;
        commentsSend(sendMessage);
        showElement(formComment.querySelector('.loader').parentElement);
        formComment.querySelector('.comments__input').value = '';
    }

    // отправляем комментарий на сервер
    function commentsSend(message) {
        fetch(`https://neto-api.herokuapp.com/pic/${imageData.id}/comments`, {
                method: 'POST',
                body: message,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
            })
            .then( res => {
                if (res.status >= 200 && res.status < 300) {
                    hideElement(formComment.querySelector('.loader').parentElement);
                    return res;
                }
                throw new Error (res.statusText);
            })
            .then(res => res.json())
            .catch(err => {
                console.log(err);
                hideElement(formComment.querySelector('.loader').parentElement);;
            });
    }
    return formComment;
}

function hideForms(currentForm = null) {
    document.querySelectorAll('.comments__form').forEach(form => {
        if (form !== currentForm) {
            form.querySelector('.comments__marker-checkbox').checked = false;
        }
    });
}

function removeForm(currentForm = null) {
    document.querySelectorAll('.comments__form').forEach(form => {
        if ( form !== currentForm && form.querySelectorAll('.comment').length < 2) {
            form.remove();
        }
    })
}

//добавляем комментарий в форму
function addMessageComment(message, form) {
    let parentLoaderDiv = form.querySelector('.loader').parentElement;

    const newMessageDiv = document.createElement('div');
    newMessageDiv.classList.add('comment');
    newMessageDiv.dataset.timestamp = message.timestamp;
        
    const commentTimeP = document.createElement('p');
    commentTimeP.classList.add('comment__time');
    commentTimeP.textContent = getDate(message.timestamp);

    newMessageDiv.appendChild(commentTimeP);

    const commentMessageP = document.createElement('p');
    commentMessageP.classList.add('comment__message');
    commentMessageP.textContent = message.message;
    commentMessageP.style.cssText = `word-wrap: break-word;
                                    white-space: pre-wrap`;

    newMessageDiv.appendChild(commentMessageP);
    form.querySelector('.comments__body').insertBefore(newMessageDiv, parentLoaderDiv);
}

//обновляем формы с комментариями
function updateCommentForm(newComment) {
    if (!newComment) return;

    Object.keys(newComment).forEach(id => {
        if (id in showComments) return;
            
        showComments[id] = newComment[id];
        let needCreateNewForm = true;

        Array.from(app.querySelectorAll('.comments__form')).forEach(form => {
            if (+form.dataset.left === showComments[id].left && +form.dataset.top === showComments[id].top) {
                form.querySelector('.loader').parentElement.style.display = 'none';
                addMessageComment(newComment[id], form); 
                needCreateNewForm = false;
            }
        });

        //создаем форму и добавляем в нее сообщение
        if (needCreateNewForm) {
            const newForm = createCommentForm(newComment[id].left + 20, newComment[id].top);
            newForm.dataset.left = newComment[id].left;
            newForm.dataset.top = newComment[id].top;
            newForm.style.left = newComment[id].left + 'px';
            newForm.style.top = newComment[id].top + 'px';
            commentsWrap.appendChild(newForm);
            addMessageComment(newComment[id], newForm);

            if (!app.querySelector('#comments-on').checked) {
                newForm.style.display = 'none';
            }
        }
    });
}

//добавляем сообщения с сервера 
function insertWssCommentForm(wssComment) {
    const wsCommentEdited = {};
    wsCommentEdited[wssComment.id] = {};
    wsCommentEdited[wssComment.id].left = wssComment.left;
    wsCommentEdited[wssComment.id].message = wssComment.message;
    wsCommentEdited[wssComment.id].timestamp = wssComment.timestamp;
    wsCommentEdited[wssComment.id].top = wssComment.top;
    updateCommentForm(wsCommentEdited);
}

//преобразуем дату и время
function getDate(timestamp) {
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const date = new Date(timestamp),
        dateStr = date.toLocaleString('ru-RU', options);

    return dateStr.slice(0, 8) + dateStr.slice(9);
}

//Рисование
const ctx = canvas.getContext('2d');
let currentColor,
    BRUSH_RADIUS = 4,
    curves = [],
    drawing = false,
    needsRepaint = false;

// выбираем цвет
Array.from(menu.querySelectorAll('.menu__color')).forEach(color => {
    if (color.checked) {  
        currentColor = getComputedStyle(color.nextElementSibling).backgroundColor;  
    }
    color.addEventListener('click', (event) => {  
        currentColor = getComputedStyle(event.currentTarget.nextElementSibling).backgroundColor; 
    });
});

canvas.addEventListener("mousedown", (event) => {
    if (!(menuDraw.dataset.state === 'selected')) return;

    hideForms();
    drawing = true;
    canvas.style.zIndex = '4';

    const curve = []; 
    curve.color = currentColor;

    curve.push(makePoint(event.offsetX, event.offsetY)); 
    curves.push(curve); 
    console.log(curve);
    needsRepaint = true;
});

canvas.addEventListener("mouseup", (event) => {
    menu.style.zIndex = '1';
    canvas.style.zIndex = '1';
    drawing = false;
});

canvas.addEventListener("mouseleave", (event) => {
    menu.style.zIndex = '1';
    canvas.style.zIndex = '1';
    drawing = false;
});

canvas.addEventListener("mousemove", (event) => {
    if (drawing) {
        menu.style.zIndex = '0';
        canvas.style.zIndex = '4';
        curves[curves.length - 1].push(makePoint(event.offsetX, event.offsetY));
        needsRepaint = true;
        debounceSendMask();
    }
});

const debounceSendMask = debounce(sendMaskState, 1000);

function sendMaskState() {
    canvas.toBlob(function (blob) {
        connection.send(blob);
    });
};

function circle(point) {
    ctx.beginPath();
    ctx.arc(...point, BRUSH_RADIUS / 2, 0, 2 * Math.PI);
    ctx.fill();
}

function smoothCurveBetween (p1, p2) {
    const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
    ctx.quadraticCurveTo(...p1, ...cp);
}

function smoothCurve(points) {
    ctx.beginPath();
    ctx.lineWidth = BRUSH_RADIUS;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.moveTo(...points[0]);

    for(let i = 1; i < points.length - 1; i++) {
        smoothCurveBetween(points[i], points[i + 1]);
    }
    ctx.stroke();
}

function makePoint(x, y) {
    return [x, y];
}

function repaint () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    curves.forEach((curve) => {
        ctx.strokeStyle = curve.color;
        ctx.fillStyle = curve.color;
    
        circle(curve[0]);
        smoothCurve(curve);
    });
};

function tick () {
    if(needsRepaint) {
        repaint();
        needsRepaint = false;
    }
    window.requestAnimationFrame(tick);
};

tick();


//Копируем ссылку
menu.querySelector('.menu_copy').addEventListener('click', copyUrl); 
urlId(paramId); 

function copyUrl() {  
    menu.querySelector('.menu__url').select(); 
    document.execCommand('copy'); 
}

function urlId(id) {
    if (!id) return;

    getFile(id);
    showMenuComments();
}

//веб-сокет
function wss() {
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${imageData.id}`);
    connection.addEventListener('message', event => {
        if (JSON.parse(event.data).event === 'pic'){
            if (JSON.parse(event.data).pic.mask) {
                canvas.style.background = `url(${JSON.parse(event.data).pic.mask})`;
            } else {
                canvas.style.background = ``;
            }
        }

        if (JSON.parse(event.data).event === 'comment'){
            insertWssCommentForm(JSON.parse(event.data).comment);
        }

        if (JSON.parse(event.data).event === 'mask'){
            canvas.style.background = `url(${JSON.parse(event.data).url})`;
        }
    });
}

// скрываем элементы
function hideElement(el) {
    el.style.display = 'none';
}

// показываем элементы
function showElement(el) {
    el.style.display = '';
}

// скрываем текст ошибки
function removeError() {
    setTimeout(function() {
        hideElement(error)
    }, 5000);
}

// ограничения частоты запуска функции
function throttle(func, delay = 0) {
    let isWaiting = false;
    
    return function (...res) {
        if (!isWaiting) {
            func.apply(this, res);  
            isWaiting = true;       
            setTimeout(() => {  
                isWaiting = false;
            }, delay);
        }
    }
}

// отложенный запуск функции, после завершения события
function debounce(func, delay = 0) {
    let timeout;
    
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
            func();
        }, delay);
    };
}
//закрываем веб-сокет соединение при уходе со страницы
window.addEventListener('beforeunload', () => { connection.close(); console.log('Веб-сокет закрыт') }); 

