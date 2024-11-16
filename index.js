import ccxt  from 'ccxt'
import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config'
import express, { json } from 'express'
import { userdata } from './constants.js';

const app = express()
const port = 8080

app.use(json())

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

let activeChats = []

const chats = {}

class Order {
    constructor(uuid, order_id) {
        this.uuid = uuid
        this.order_id = order_id        
    }
}

class User {
    constructor(username, uuid, order_id) {
        this.username = username
        this.uuid = uuid
        this.order_id = order_id
        this.start = new Date().getTime()
        this.end = new Date().getTime() + (30 * 24 * 60 * 60 * 1000)
    }
}

function clearProfitCallculate(asks, bids) {
    const filteredAsks = []
    const filteredBids = []

    for (let i = 0; i < 5; i++) {
        if (asks[i][0] < bids[i][0]) {
            filteredAsks[i] = asks[i]
            filteredBids[i] = bids[i]
        } else {
            break
        }
    }

    const asksCount = filteredAsks.reduce((acc, el) => acc + el[1], 0)
    const bidsCount = filteredBids.reduce((acc, el) => acc + el[1], 0)
    const count = Math.min(asksCount, bidsCount)

    let buyPrice = 0

    let tempCountForAsks = count
    filteredAsks.forEach(ask => {
        if (tempCountForAsks >= ask[1]) {
            buyPrice += ask[0] * ask[1]
            tempCountForAsks -= ask[1]
        } else if (tempCountForAsks) {
            buyPrice += ask[0] * (tempCountForAsks)
            tempCountForAsks = 0
        }
    })

    let sallPrice = 0

    let tempCountForBids = count
    filteredBids.forEach(bid => {
        if (tempCountForBids >= bid[1]) {
            sallPrice += bid[0] * bid[1]
            tempCountForBids -= bid[1]
        } else if (tempCountForBids) {
            sallPrice += bid[0] * (tempCountForBids)
            tempCountForBids = 0
        }
    })

    return {
        buyPrice: buyPrice.toFixed(3), 
        sallPrice: sallPrice.toFixed(3), 
        count: count.toFixed(3),
        profitMoney: +sallPrice.toFixed(3) - +buyPrice.toFixed(3)
    }

}

const binance = new ccxt.binance({
    apiKey: 'bHLIMnUMSjWZN5mssqwRWhdWF0GYJb9dSqoPR4Dw7KLvO5otSLzgr3qJ1eMbBFb2',
    secret: 'HIA851ik0rlUoKxiGm5RKNgqPUWGC1sx4DW88FgUN4GLxmKgJrJQnvt4PpbaRhFE',
});
const bybit = new ccxt.bybit({
    apiKey: 'LCdAA8uroNmIek4OaR',
    secret: 'IlQhPr4t7xenxU7kpd9Xc4k1KUXgeB7AeQ19',
});
const bitgate = new ccxt.bitget({
    apiKey: 'bg_f0849470c8ee1d79c564b079f0df2c4c',
    secret: '8e1cbd59a0d9c90cc1e445ebec9f246526a605e7429d164ff66739ace96d8722',
});
const gate = new ccxt.gateio({
    apiKey: '8a3f5d514a5fe906b11d0dc27d79e1fb',
    secret: '47ac6a82419d5f618cc054833ce6d4ee0244e8da860c29c9284764e9bb0f47ca',
});
const kucoin = new ccxt.kucoin({
    apiKey: '65e8d4c82f6471000104c7c4',
    secret: 'be052e89-139f-4f23-8cd9-8496769fe791',
});
const mexc = new ccxt.mexc({
    apiKey: 'mx0vgluhamqRrJESoo',
    secret: '8ae441b4e4104a819667116b1151add6',
});
const okx = new ccxt.okx({
    apiKey: '0d5a01a7-f526-4385-a9f9-769219947501',
    secret: '368C741A60AAEEBC56E32E973D76AE80',
    password: 'Samurai777$'
});
const htx = new ccxt.htx({
    apiKey: '12023ba0-1e57897a-qz5c4v5b6n-673f1',
    secret: 'e586f69d-ead81e48-adcebbdf-61611',
});
const lbank = new ccxt.lbank({
    apiKey: '713a13e7-9a73-4246-99bc-b150f212138e',
    secret: 'MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBALgpJu3zdirCqlO5sN11DOy4XqeU0lOPP8ctZeHagcOrOfEf6aUWGz6RE4kwBfLbajDr2ed2f707UdY8wGLpHyeRwhXU6jubUHuug0LlaUAFSnkfHRzndpOl5Du+H6RMBYSyfAzgMm3/a/WLwHKHoln6+yqKajV4qErc1H12FD5BAgMBAAECgYBvFUuJHmC5vEAXTpuziUYph7B4rxkLFA4pa2XYDQBW8XJ60oARdzspy0KYbqI38kekiK8goea9UwmzC2QUhX+nShQMAOIzyp3hXWrBfzrq6yfiysR8ps2XJNiQ6prAkag+qzo8VG300fmGmeIoQU92jXWAd/YP/PpbvVdUGYeVQQJBAP/r91kHuikzgmwkVQ7uFEEE4TDX1o8bugeE7oJZjV6AKu7Fy6KKKpUGUisMtLmAXa2IM9ABCOlw7SBQrW2pJzkCQQC4N5F/NKKwGK/NBQsv060xtBEUBgI6u39IdubKJjXukjqp/Xrg+M8xSj9s8x0t/25OKTxcYHvTFpfivesVcYdJAkEA4pNgy5vBv1RxNZj9DVjO6bmOPZX5yX18t8eC+jiapn3GhNrtLJwykvmjqaV4I3t4dHhPluozn6lw5tlGkf3eUQJAZ///JUiK/E3DmkRZr3OamK/m4F4QDiZiUn/GBaQS2JA3jFatc6skFdir/A84jwpgtMG08RYLcf2UXA8KU/3W+QJBANeQcKoS63v0qeyWTkFheDzWtbiJLdj4UD2sJBUJzMvAnHrZ8PCn/8czrhI1CdaC61Vog8CCh9fd8I4shc7sT6w=',
});
const bingx = new ccxt.bingx({
    apiKey: 'Ha5fhVl6drSxZrMKVucDCklCHC0CZGUpvg13idpJ0JT2SeyvagR9cMos3fjVjQMbsUS6QOUb33J3iGX0vEtVg',
    secret: 'HG1lbR06qTNdFAavsAstbMS4yZUBjzwRIXOJmrWugnJC7oNqfUSQaKtZtJeLzKZQXhONiLOOg9osbGmZmmrILQ',
});
const kraken = new ccxt.kraken({
    apiKey: 'vf+UiIA8UdQalMT8qInSqy2buf7OKzUTddK4n1DkIAvpPziG34Qulcvr',
    secret: 'vf+UiIA8UdQalMT8qInSqy2buf7OKzUTddK4n1DkIAvpPziG34Qulcvr',
});
const ascendex = new ccxt.ascendex()
const bitmart = new ccxt.bitmart()
const bitrue = new ccxt.bitrue()

const exchanges = [binance, bybit, bitgate, gate, mexc, htx, lbank, bingx, kraken, ascendex, bitmart, bitrue];
const urls = Object.fromEntries(exchanges.map(exchange => [exchange.id, exchange.urls.www]))
const coins = userdata.reduce((acc, el) => [...acc, ...el], []).map(el => el.split('/')[0])

let newMessages = []

async function callNetworks(exchange, coins) {
    const result = {}
    switch (exchange.id) {
        case 'mexc':
        case 'bybit':
        case 'kucoin':
        case 'bitget':
        case 'gateio':
        case 'htx':
        case 'lbank':
        case 'kraken':
            try {
                await exchange.loadMarkets();
                const currencies = await exchange.fetchCurrencies();
                coins.forEach(async (coin) => {
                    if (coin in currencies) {
                        const coinInfo = currencies[coin];
                        result[coin] = Object.keys(coinInfo.networks)
                    } else {
                        result[coin] = []
                    }

                })
            } catch (error) { }

            break;
        default:
            try {
                await exchange.loadMarkets();
                const currencies = await exchange.fetchCurrencies();
                coins.forEach(async (coin) => {
                    if (coin in currencies) {
                        const coinInfo = currencies[coin];
                        if ('info' in coinInfo && 'networkList' in coinInfo.info) {
                            result[coin] = coinInfo.info.networkList.map(networkListItem => networkListItem.network)
                        }
                    } else {
                        result[coin] = []
                    }

                })
            } catch (error) { }

            break;
    }
    return result

}
binance.networks = await callNetworks(binance, coins)
okx.networks = await callNetworks(okx, coins)
mexc.networks = await callNetworks(mexc, coins)
bybit.networks = await callNetworks(bybit, coins)
gate.networks = await callNetworks(gate, coins)
kucoin.networks = await callNetworks(kucoin, coins)
bitgate.networks = await callNetworks(bitgate, coins)
htx.networks = await callNetworks(htx, coins)
lbank.networks = await callNetworks(lbank, coins)
bingx.networks = await callNetworks(bingx, coins)
kraken.networks = await callNetworks(kraken, coins)

setInterval(async () => {

    binance.networks = await callNetworks(binance, coins)
    okx.networks = await callNetworks(okx, coins)
    mexc.networks = await callNetworks(mexc, coins)
    bybit.networks = await callNetworks(bybit, coins)
    gate.networks = await callNetworks(gate, coins)
    kucoin.networks = await callNetworks(kucoin, coins)
    bitgate.networks = await callNetworks(bitgate, coins)
    htx.networks = await callNetworks(htx, coins)
    lbank.networks = await callNetworks(lbank, coins)
    bingx.networks = await callNetworks(bingx, coins)
    kraken.networks = await callNetworks(kraken, coins)

}, (24 * 60 * 60 * 1000))


function convertArr2ToString(arr) {
    arr = arr.map(item => ['Цена: ' + item[0], 'Объем: ' + item[1] + ' шт'])
    const maxFirstItemLength = Math.max(...arr.map(item => item[0].toString().length))
    const maxSecondItemLength = Math.max(...arr.map(item => item[1].toString().length))
    const spaces = 2
    const row = '-'.repeat(maxFirstItemLength + maxSecondItemLength + 5 * spaces + 1)
    const table = arr.map(item => '|' + ' '.repeat(spaces) +
        item[0].toString() + ' '.repeat(maxFirstItemLength - item[0].toString().length + spaces) +
        '|' + ' '.repeat(spaces) +
        item[1].toString() + ' '.repeat(maxSecondItemLength - item[1].toString().length + spaces) +
        '|'
    ).join(` 
`)
    return row + '\n' + table + '\n' + row
}

const call = async (tickers) => {

    const cryptoPrices = {};

    async function getTickerPrice(exchange, tickerSymbol, exchangeIdx) {
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            let orderBook
            if (exchange === kucoin) {
                orderBook = await exchange.fetchOrderBook(tickerSymbol, 20)
                orderBook.asks = orderBook.asks.slice(0, 5)
                orderBook.bids = orderBook.bids.slice(0, 5)
            } else {
                orderBook = await exchange.fetchOrderBook(tickerSymbol, 5)                
            }
            const currentDate = new Date();
            const networks = exchange.networks[tickerSymbol.split('/')[0]]
            const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
            const dateTime = currentDate.toLocaleString(undefined, options)
            const key = `${exchange.id}_${tickerSymbol}`;
            cryptoPrices[key] = { minPrice: orderBook.asks[0][0], maxPrice: orderBook.bids[0][0], dateTime, exchangeIdx, networks, orderBook };
        } catch (e) {
            if (exchange === kucoin) {
                console.log(e);
            }
        }
    }

    const tasks = [];
    exchanges.forEach((exchange, exchangeIdx) => {
        tickers.forEach((tickerSymbol) => {
            tasks.push(getTickerPrice(exchange, tickerSymbol, exchangeIdx));
        });
    });
    await Promise.all(tasks);
    // console.log(cryptoPrices);
    const keys = Object.keys(cryptoPrices);
    const df = keys.map(key => ({ key, ...cryptoPrices[key] }));

    const list = {}
    const coins = new Set()
    const result = {}

    for (let i = 0; i < df.length; i++) {
        const item = df[i]
        const key = item.key.split('_')[1]
        coins.add(key)
        if (list[key]) {
            if (list[key].max.maxPrice < item.maxPrice) {
                list[key].max = item
            }
            if (list[key].min.minPrice > item.minPrice) {
                list[key].min = item
            }
            if (list[key].max.maxPrice / list[key].min.minPrice - 1 > 0.004 && list[key].max.maxPrice / list[key].min.minPrice - 1 < 0.3) {
                result[key] = {...list[key]}
                result[key].profit = ((list[key].max.maxPrice / list[key].min.minPrice - 1) * 100).toFixed(2) + ' %'
            }
        } else {
            list[key] = {
                max: item,
                min: item
            }
        }
    }
    
    newMessages = Object.values(result)
    .map(element => {
        const callculatedProfitInfo = clearProfitCallculate(element.min.orderBook.asks, element.max.orderBook.bids)
        const message = `
📊 Currency pair: <b>${element.min.key.split('_')[1]}</b>
💼 Exchanges: <b>${element.min.key.split('_')[0]} ➡️ ${element.max.key.split('_')[0]}</b>

📈 Buy: <a href="${urls[element.min.key.split('_')[0]]}">${element.min.key.split('_')[0]}</a> 
💸 Price: <b><code>${element.min.minPrice}</code></b>

📉 Sale: <a href="${urls[element.max.key.split('_')[0]]}">${element.max.key.split('_')[0]}</a>
💸 Price: <b><code>${element.max.maxPrice}</code></b>

🌐 Supported networks:
${element.min.key.split('_')[0]}: <b>${element.min.networks?.length ? element.min.networks?.join(', ') : 'Network not found'}</b> 
${element.max.key.split('_')[0]}: <b>${element.max.networks?.length ? element.max.networks?.join(', ') : 'Network not found'}</b> 

💹 Profit:
Profit %: <b>${element.profit}</b>

        `
        return message
    })

    await call(tickers);
}

userdata.forEach(async (tickers) => {
    await call(tickers)
})

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    function messageSender(message){
        bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            disable_web_page_preview: true
        });
    }

    if (messageText === '/start') {
        
        if (!activeChats.includes(chatId)) {
            activeChats.push(chatId)
            messageSender('Welcome to Samurai Arbitrage Bot! Already looking for arbitrage bundles for you!');
            let prevMessages = []
            chats[chatId] = setInterval(() => {
                if (JSON.stringify(prevMessages) !== JSON.stringify(newMessages) && newMessages.length && activeChats.includes(chatId)) {
                    newMessages.forEach(message => {
                        messageSender(message)
                    })
                    prevMessages = newMessages
                }
            }, 500)


        } else {
            messageSender('The bot has already been launched!');
        }
    } else if (messageText === '/stop') {
        activeChats = activeChats.filter(id => id !== chatId)
        clearInterval(chats[chatId])
        messageSender('The bot has been stopped!');
    } 
    // else if (messageText === '/help') {
    //     activeChats = activeChats.filter(id => id !== chatId)
    //     messageSender('Help message.');
    // }
});


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
