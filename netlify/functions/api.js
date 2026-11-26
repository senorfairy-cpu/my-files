const {handleApi,errorResponse}=require('./portfolio-api');
exports.handler=async event=>{try{return await handleApi(event);}catch(error){return errorResponse(error);}};
