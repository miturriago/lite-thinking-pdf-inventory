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
    let mat = [];

    for (let i = 0; i < resultRequest.length; i++) {
      mat.push([resultRequest[i].fullName, resultRequest[i].quantity]);
    }

    console.log(mat);

    const accessToken = event.headers.Authorization.substring(7);
    let decoded = jwt_decode(accessToken);
    const downloadDate = new Date().toDateString();

    const doc = new PDFDocument();
    doc.font("Helvetica-Bold");
    doc.moveDown();
    doc.text("Lite Thinking - Inventario", { align: "center" });
    doc.text("Descargado por: ", { align: "left" });
    doc.font("Helvetica");
    doc.text(decoded.email, { align: "left" });
    doc.font("Helvetica-Bold");
    doc.text("Fecha de envío: ", { align: "left" });
    doc.font("Helvetica");
    doc.text(downloadDate, { align: "left" });

    doc.moveDown().moveDown().moveDown().moveDown();

    // Crea una tabla con dos filas y dos columnas
    const table = {
      headers: ["Nombre", "Cantidad"],
      rows: mat,
    };

    // Define la posición y tamaño de la tabla
    const startX = 115;
    const startY = 170;
    const rowHeight = 50;
    const colWidth = 200;

    // Dibuja los encabezados de la tabla
    doc.font("Helvetica-Bold");
    for (let i = 0; i < table.headers.length; i++) {
      doc.rect(startX + i * colWidth, startY, colWidth, rowHeight).stroke();
      doc.text(table.headers[i], startX + i * colWidth + 10, startY + 20);
    }

    // Dibuja las celdas de la tabla
    doc.font("Helvetica");
    for (let i = 0; i < table.rows.length; i++) {
      for (let j = 0; j < table.rows[i].length; j++) {
        doc
          .rect(
            startX + j * colWidth,
            startY + (i + 1) * rowHeight,
            colWidth,
            rowHeight
          )
          .stroke();
        doc.text(
          table.rows[i][j].toString(),
          startX + j * colWidth + 10,
          startY + (i + 1) * rowHeight + 20
        );
      }
    }

    doc.end();

    // Configurar el transporte SMTP para enviar el correo electrónico
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.nodemailer_user,
        pass: process.env.nodemailer_pss,
      },
    });

    // Configurar el mensaje de correo electrónico
    const mailOptions = {
      from: process.env.nodemailer_user,
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
