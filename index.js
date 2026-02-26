require("dotenv").config();

const express = require("express");
const axios = require("axios");
const QRCode = require("qrcode");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ===========================
   BOT ONLINE
=========================== */

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

/* ===========================
   COMANDO +pg
=========================== */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/ +/);
  const comando = args[0].toLowerCase();

  if (comando === "+pg") {

    const valor = args[1];

    if (!valor || isNaN(valor)) {
      return message.reply("Use: +pg 10");
    }

    try {

      const response = await axios.post(
        "https://api.pushinpay.com.br/api/pix/cashIn",
        {
          value: Number(valor) * 100,
          webhook_url: "https://bot-pix-vrnl.onrender.com/webhook"
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PUSHINPAY_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      const pix = response.data;

      if (!pix.qr_code) {
        console.log("❌ Resposta inesperada da PushinPay:", pix);
        return message.reply("Erro ao gerar QR Code.");
      }

      const qrBuffer = await QRCode.toBuffer(pix.qr_code);

      const embed = new EmbedBuilder()
        .setTitle("💰 Pagamento PIX Gerado")
        .setDescription("Escaneie o QR Code ou copie o código abaixo:")
        .addFields({
          name: "Copia e Cola",
          value: `\`\`\`${pix.qr_code}\`\`\``
        })
        .setColor("Green")
        .setImage("attachment://qrcode.png");

      await message.reply({
        embeds: [embed],
        files: [{ attachment: qrBuffer, name: "qrcode.png" }]
      });

    } catch (err) {
      console.log("❌ ERRO AO GERAR PIX:");
      console.log(err.response?.data || err.message);
      message.reply("❌ Erro ao gerar pagamento.");
    }
  }
});


/* ===========================
   WEBHOOK ULTRA SEGURO
=========================== */

app.post("/webhook", async (req, res) => {

  try {

    console.log("📩 Webhook recebido:");
    console.log(JSON.stringify(req.body, null, 2));

    const body = req.body;

    if (!body || Object.keys(body).length === 0) {
      console.log("⚠️ Webhook vazio");
      return res.sendStatus(200);
    }

    // Detecta status em vários formatos possíveis
    let status =
      body.status ||
      body.data?.status ||
      null;

    if (status) status = String(status).toUpperCase();

    if (status === "PAID") {

      const canal = await client.channels.fetch("1476247725564629254");

      // Detecta valor em vários formatos
      let valor =
        body.value ||
        body.amount ||
        body.data?.value ||
        body.data?.amount ||
        0;

      valor = Number(valor);

      const valorFormatado = valor
        ? `R$ ${(valor / 100).toFixed(2)}`
        : "Valor não informado";

      // Detecta nome em vários formatos
      const nomePagador =
        body.payer_name ||
        body.customer?.name ||
        body.data?.customer?.name ||
        "Nome não informado";

      await canal.send({
        embeds: [{
          title: "✅ Pagamento Confirmado",
          description:
            `💰 Valor: ${valorFormatado}\n` +
            `👤 Pago por: ${nomePagador}`,
          color: 0x00ff00
        }]
      });

      console.log("✅ Pagamento confirmado enviado ao Discord");
    }

    res.sendStatus(200);

  } catch (error) {
    console.log("❌ ERRO REAL DO WEBHOOK:");
    console.log(error);
    res.sendStatus(500);
  }
});


/* ===========================
   SERVIDOR
=========================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Webhook rodando na porta ${PORT}`);
});


/* ===========================
   LOGIN DISCORD
=========================== */

console.log("Token carregado:", process.env.DISCORD_TOKEN ? "SIM" : "NÃO");
client.login(process.env.DISCORD_TOKEN);