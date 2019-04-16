#bot
## где взять параметры
F12, Сеть, фильтр по 

    https://game.web-tycoon.com/api  
    
Затем, обновляете страницу, из 4х GET-запросов берете любой. Чекаем URL запроса - 
  
  
    https://game.web-tycoon.com/api/tenders/5c8basdasdasd/current?access_token=asdasdasd&connectionId=asdasdasd&ts=asdasdasd 
  
 
5c8basdasdasd - userId, остальное по параметрам понятно.
  
  
  
## Добавление таски в бот на CF
Переходите в браузере по юрл
```
https://wtbot.cfapps.eu10.hana.ondemand.com/add?userId=USERID&accessToken=ACCESSTOKEN&connectionId=CONNECTONID
```
дополнительным параметром можно указать `&timeout=TIMEOUT_IN_MILLS` таймаут в миллисекундах между реквестами на чистку спама/паблишинг нового контента. По дефолту - 300000, что есть 5 минут. Чаще ставить не советую, вдруг забанят.

Сервер отвечает в районе 2 секунд - потому что сразу же пытается выполнить 1 задачу на клин/паблиш. Если задача выполнена успешно, реквесты не оборвались - вернется страница с текстом Hello World. Иначе - в теле ответа будет ошибка

## Инфа по таскам

переходите в браузере по
```
https://wtbot.cfapps.eu10.hana.ondemand.com/info
```
все станет понятно

Если токен истек - посылаете новый `/add` запрос, сервер обновит конфиг для вашего userId и автоматически удалит старый шедулинг на выполнение тасок. 

## Генерация юрла
открываете консоль разработчика в хроме на странице с игрой (должны быть залогинены!) и вставляете
```
console.log("https://wtbot.cfapps.eu10.hana.ondemand.com/add?userId=" + localStorage.getItem("userId") + "&accessToken=" + localStorage.getItem("token") + "connectionId=")
```
(тут надо еще доделать и понять, как программно вытащить connectionId, потому что он не хранится в localStorage)
Жмякаете энтер, вы в шоколаде, трафик растет, 666_NAGIBATORI_666 в топе всех рейтингов

GL HF
