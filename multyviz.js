// --------- Настройки программы -----------------

// --- необходимые библиотеки устанавливаются через npm
const viz = require("viz-js-lib")

// Подключение api-node
const VIZNODE = "wss://viz.lexai.host/ws" // public node
//const VIZNODE = "ws://192.168.1.245:8191" // local node
viz.config.set('websocket', VIZNODE)

// Настройки скрипта

var timeout=28 // sec период проверки работоспособности (учитывайте нагрузку на паблик-ноду)
var timewait=10*60 // sec время ожидания восстановления работоспособности до активации
var keyoff="VIZ1111111111111111111111111111111114T1Anm"
var urloff="Disable via js"
// Ноды для мониторинга

var users= {
    "retroscope": [
        "5Asdfgh...",  // Активный ключ
        "https://control.viz.world/witnesses/",                 // URL заявления о намерениях
        "VIZ5m14X9UrUkZUM67A546ak6CezBKce3TbYrMJQFXqGKDSmQNN9B", // Публичный ключ подписи
        0,
        0
        ],

    "jackvote": [
        "5Qwerty...",
        "https://control.viz.world/witnesses/",
        "VIZ5Cs3hmjaHF5Mm744D9Ed56ikcNovYHAH4wBM15K9xuDphuxZAA",
        0,
        0
        ]

    }

// =======================================================================
console.log("Start monitoring")

function checkAll() {
    let delay=0
    for (let owner in users) {
        setTimeout(checkMissed, delay, owner) // разносим по времени запросы к апи-ноде
        delay+=1000
    }
}

function checkMissed(owner) {

    viz.api.getWitnessByAccount(owner, function(err,result){
        if (err) {
            console.log(err)
            return
        }
        if (result==null) {
            console.log(owner, "not witness - deleted from list")
            delete users[owner]
            return
        }
        let time=parseInt(new Date().getTime()/1000) // unixtimestamp
        if (result.signing_key==keyoff) { // отключена ли нода
            disable=true
        } else {
            disable=false
        }

        let [wif, url, keyon, missed, timeoff] = users[owner]

        if (users[owner][3]==0) { // начальная инициализация счётчика при запуске скрипта
            users[owner][3]=result.total_missed
            console.log(owner, Date(), "Set current:", result.total_missed)
            return
        }
        if (result.total_missed>missed && disable==false) { // если счётчик увеличился, а нода не отключена
            users[owner][3]=result.total_missed
            setkey(disable, owner) // отключаем
            users[owner][4]=time // заносим время отключения
            return
        }
        if (result.total_missed>missed && disable && (time-timeoff)<timewait) { // если счётчик увеличился, а нода отключена
            users[owner][3]=result.total_missed
            console.log(Date(), "Disable now:", missed)
            return
        }
        if (result.total_missed==missed && disable && time-timeoff>=timewait) { // счётчик не изменился с момента проверки - включай
            setkey(disable, owner) // включаем
            users[owner][4]=0 // пофиг
            return
        }
    });
}

function setkey(action, owner) {
  try {
    let [wif, urluser, keyon, missed, timeoff] = users[owner]
    let key=keyoff
    let url=urloff
    if (action) {
        key=keyon
        url=urluser
        func="Enable"
    } else {
        func="Disable"
    }
    viz.broadcast.witnessUpdate(wif,owner,url,key,function(err,result){
        if (err) {
            console.log(err)
            return
        }
        console.log(Date(), owner+" | "+func+" witness:", missed)
    });
  } catch (err) {
    console.log("SetKey >>>", e.name)
  }
}

/// Основной цикл
const startCheck = () => {

    timerCheckOff = setInterval(()=>{
        checkAll()
    }, timeout*1000)
}

const startBot = () => {
    checkAll()
    startCheck()
}

startBot() // запуск скрипта
