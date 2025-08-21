// import { Client, LocalAuth } from "whatsapp-web.js"
import qrcode from "qrcode-terminal"
import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js"

const clients = {}

function startClient(id) {
    clients[id] = new Client({
        authStrategy: new LocalAuth({
            clientId: id
        }),
        webVersionCache: {
            type: 'remote',
            remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2407.3.html`
        }
    })

    clients[id].initialize().catch(err => console.log(err))
    
    clients[id].on("qr", (qr) => {
        qrcode.generate(qr, { small: true })
    })
    clients[id].on("ready", () => console.log("Client is ready!"))
    
    clients[id].on("message", async (msg) => {
        try {
            if (process.env.PROCCESS_MESSAGE_FROM_CLIENT && msg.from != "status@broadcast") {
                const contact = await msg.getContact()
                console.log(contact, msg.from)
            }
        } catch (error) {
            console.error(error)
        }
    })
}

function sendMessage(phoneNumber, message, clientId, file) {
    if(file) {
        const messageFile = new MessageMedia(file.mimetype, file.buffer.toString('base64'))
        clients[Number(clientId)].sendMessage(phoneNumber, messageFile)
    } else {
        clients[clientId].sendMessage(phoneNumber, message);
    }
}

export { startClient, sendMessage }

// hello