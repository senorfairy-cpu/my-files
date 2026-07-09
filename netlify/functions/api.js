const { handleApi } = require("./portfolio-api");

exports.handler = async event => {
  try {
    return await handleApi(event);
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
