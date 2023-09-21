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

client.login(process.env.TOKEN)

client.on("ready", async () => {
    console.log(client.user.tag + " is ready")
    user = await client.users.fetch(process.env.USERID)

    envoiTempsTrajet()

    let carnetJob = new cron.CronJob('45 7 * * 1-5', envoiTempsTrajet)
    carnetJob.start()
})

async function envoiTempsTrajet() {
    console.log("Envoi du temps de trajet")

    const targetArrivalTime = new Date();
    targetArrivalTime.setHours(8, 15, 0, 0); // 8h15

    const routes = await mesureTempsTrajet()
    let color = 0x00ff00

    const embed = new EmbedBuilder()
        .setTitle("Temps de trajet")
        .setTimestamp()

    let tempsMin

    routes.forEach(route => {
        const duration = route.legs.reduce((total, leg) => total + leg.duration.value, 0)
        const travelTimeInMinutes = Math.ceil(duration / 60)

        if (tempsMin === undefined || tempsMin > travelTimeInMinutes) {
            tempsMin = travelTimeInMinutes
        }

        // ajout de 5 minutes pour se garer et 6 minutes pour se garer
        const heure_de_depart = new Date(targetArrivalTime.getTime() - (travelTimeInMinutes) * 60 * 1000);
        const heure_de_depart_conseille = new Date(targetArrivalTime.getTime() - (travelTimeInMinutes + 6 + 5) * 60 * 1000);

        embed.addFields({
            name: `Via ${route.summary}`,
            value: `Temps de trajet : ${travelTimeInMinutes} min
Heure de depart : ${heure_de_depart.getHours()}h${heure_de_depart.getMinutes()}
Heure de depart conseillé : ${heure_de_depart_conseille.getHours()}h${heure_de_depart_conseille.getMinutes()}`
        })
    })

    if (tempsMin <= 10) {
        color = 0x75fa3c
    } else if (tempsMin <= 15) {
        color = 0xfadd3c
    } else {
        color = 0xfa3c3c
    }


    embed.setColor(color)
    user.send({ embeds: [embed] })
}

async function mesureTempsTrajet() {
    try {
        console.log("Recuperation du temps de trajet")
    
        const params = {
            origin: process.env.origin,
            destination: process.env.destination,
            mode: 'driving',
            alternatives: true,
            targetArrivalTime: new Date().setHours(8, 15, 0, 0),
            key: process.env.APIKEY
        }
    
        return await axios
            .get('https://maps.googleapis.com/maps/api/directions/json', { params })
            .then(response => {
                const { routes } = response.data;
                return routes
            })
            .catch(error => {
                console.error('Error:', error)
            })
    } catch (error) {
        console.log(error)
    }
}
