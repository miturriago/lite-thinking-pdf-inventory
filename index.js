"use strict";
require("dotenv").config();
const AWS = require("aws-sdk");
const dynamoDb = require("./services/dynamo.service");
const ajvO = require("ajv");
const jwt_decode = require("jwt-decode");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

const ajvRq = new ajvO();

const schemaGetInventoriesRq = require("./schemas/rqGetInventoriesSchema.json");
const validateGetRq = ajvRq.compile(schemaGetInventoriesRq);

module.exports.generatePDF = async (event) => {
  const data = JSON.parse(event.body);
  let valid = validateGetRq(data);

  if (!valid) {
    return {
      statusCode: 406,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "Empty fields are not accepted",
        details: validateGetRq.errors[0],
      }),
    };
  }
  const { nit } = data;

  let resultRequest = {};

  try {
    resultRequest = await dynamoDb.scan(
      nit,
      process.env.TABLE_NAME + "-" + process.env.STAGE
    );
    const doc = new PDFDocument();
    // Código a ejecutar en cada iteración
    // Generar el contenido del PDF
    resultRequest.forEach((item) => {
      doc.text(item.fullName + " " + item.quantity);
    });
    doc.end();

    // Configurar el transporte SMTP para enviar el correo electrónico
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "camilj31@gmail.com",
        pass: "jvlxtgevadfnwbzf",
      },
    });
    const accessToken = event.headers.Authorization.substring(7);
    let decoded = jwt_decode(accessToken);

    // Configurar el mensaje de correo electrónico
    const mailOptions = {
      from: "camilj31@gmail.com",
      to: decoded.email,
      subject: "Archivo PDF de inventario",
      text: "Archivo PDF generado",
      attachments: [
        {
          filename: "archivo.pdf",
          content: doc,
          contentType: "application/pdf",
        },
      ],
    };

    // Enviar el correo electrónico
    const result = await transporter.sendMail(mailOptions);
    console.log(result);
  } catch (error) {
    console.log("Error get users: ", error);
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify({
      message: "PDF generado y enviado por correo electrónico",
    }),
  };
};
