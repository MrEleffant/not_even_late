const axios = require('axios')
require('dotenv').config()
const cron = require('cron')

const { Client, PermissionsBitField, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedAssertions } = require('discord.js')
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildMembers,
    ]
})

let user
const origin = process.env.ORIGIN
const destination = process.env.DESTINATION

client.login(process.env.TOKEN)

client.on("ready", async () => {
    console.log(client.user.tag + " is ready")
    user = await client.users.fetch(process.env.USERID)

    envoiTempsTrajet()

    let carnetJob = new cron.CronJob('45 7 * * 1-5', envoiTempsTrajet)
    carnetJob.start()
})

async function envoiTempsTrajet() {
    console.log("envoi du temps de Trajet")
    const targetArrivalTime = new Date();
    targetArrivalTime.setHours(8, 15, 0, 0); // 8h15


    const routes = await mesureTempsTrajet()
    let color = 0x00ff00

    const embed = new EmbedBuilder()
        .setTitle("Temps de trajet")
        .setTimestamp()

    let bestTime
    routes.forEach(route => {
        const duration = route.legs.reduce((total, leg) => total + leg.duration.value, 0)
        const travelTimeInMinutes = Math.ceil(duration / 60) + 6 // 6 minutes de securité
        const heure_de_depart = new Date(targetArrivalTime.getTime() - (travelTimeInMinutes + 5) * 60 * 1000); // Soustraire le temps de trajet et 5 minutes pour sortir la voiture

        // memo best route
        if (!bestTime || travelTimeInMinutes < bestTime) {
            bestTime = travelTimeInMinutes
        }


        console.log(`Travel time between ${origin} and ${destination} by car: ${travelTimeInMinutes} minutes`)
        embed.addFields({
            name: `Via ${route.summary}`,
            value: `${travelTimeInMinutes} minutes, heure de départ: ${heure_de_depart.getHours()}:${heure_de_depart.getMinutes()}`
        })
    })  

    if (bestTime < 15) {
        color = 0x00ff00
    } else if (bestTime < 20) {
        color = 0xffee00
    } else {
        color = 0xff0000
    }
    
    
    embed.setColor(color)
    user.send({ embeds: [embed] })
}

async function mesureTempsTrajet() {
    const params = {
        origin,
        destination,
        mode: 'driving',
        alternatives: true,
        key: process.env.APIKEY
    }

    return await axios
        .get('https://maps.googleapis.com/maps/api/directions/json', { params })
        .then(response => {
            const { routes } = response.data;
            return routes
        })
        .catch(error => {
            console.error('Error:', error.message)
        })
}
