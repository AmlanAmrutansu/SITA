const fs = require('fs');
const path = 'artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

// We need to replace the error handling in three places.
const replaceErrorHandling = (code) => {
  return code.replace(
    /const isConfigError = error\?\.message\?\.includes\("AI_PROVIDER_NOT_CONFIGURED"\);\n\s*res\.status\(isConfigError \? 503 : 500\)\.json\({\n\s*success: false,\n\s*requestId,\n\s*code: isConfigError \? "AI_PROVIDER_NOT_CONFIGURED" : "AI_PROVIDER_ERROR",\n\s*message: isConfigError \? "GROQ_API_KEY is not configured\." : "SITA could not reach the AI service right now\."\n\s*}\);/g,
    `const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");
    const isModelUnavailable = error?.message?.includes("AI_MODEL_UNAVAILABLE");
    
    let code = "AI_PROVIDER_ERROR";
    let message = "SITA could not reach the AI service right now.";
    let status = 500;
    
    if (isConfigError) {
      code = "AI_PROVIDER_NOT_CONFIGURED";
      message = "GROQ_API_KEY is not configured.";
      status = 503;
    } else if (isModelUnavailable) {
      code = "AI_MODEL_UNAVAILABLE";
      message = "The selected AI model is currently unavailable or decommissioned. Please try again later or contact support.";
      status = 503;
    }
    
    res.status(status).json({
      success: false,
      requestId,
      code,
      message
    });`
  );
};

code = replaceErrorHandling(code);
fs.writeFileSync(path, code);
