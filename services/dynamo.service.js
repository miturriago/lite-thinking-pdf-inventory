"use strict";
const AWS = require("aws-sdk");
require("dotenv").config();

AWS.config.update({
  maxRetries: 3,
  httpOptions: { timeout: 30000, connectTimeout: 5000 },
  region: "us-east-1",
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessSecretKey: process.env.ACCESS_SECRET_KEY,
});

let docClient = new AWS.DynamoDB.DocumentClient();

module.exports.putItem = async (db_item, table_name) => {
  let params = {
    TableName: table_name,
    Item: db_item,
  };

  let result = await docClient.put(params).promise();
  return result;
};

module.exports.scan = async (nit, table_name) => {
  let params = {
    TableName: table_name,
    KeyConditionExpression: "PK = :PK and  begins_with(SK, :SK)",
    ExpressionAttributeValues: {
      ":PK": "#INVENTORIES",
      ":SK": "#INVENTORY#" + nit,
    },
  };
  return new Promise((resolve, reject) => {
    docClient.query(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data.Items);
      }
    });
  });
};

module.exports.scanItem = async (db_item, table_name) => {
  let params = {
    TableName: table_name,
    KeyConditionExpression: "PK = :PK and SK = :SK",
    ExpressionAttributeValues: {
      ":PK": "#INVENTORIES",
      ":SK": "#INVENTORY#" + db_item.nit + "#" + db_item.fullName,
    },
  };
  return new Promise((resolve, reject) => {
    docClient.query(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data.Items[0]);
      }
    });
  });
};

module.exports.deleteItem = async (db_item, table_name) => {
  let params = {
    TableName: table_name,
    Key: {
      PK: db_item.PK,
      SK: db_item.SK,
    },
  };
  return new Promise((resolve, reject) => {
    docClient.delete(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};
