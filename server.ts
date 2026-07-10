import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";
import xlsx from "xlsx";

dotenv.config();

// Helper to extract plain text from text files, Word files, and Excel spreadsheets
async function getDocumentText(base64Data: string, mimeType: string): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64");

  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword")
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } catch (err) {
      console.error("Error reading Word file:", err);
      throw new Error("خطا در خواندن فایل ورد. لطفا فرمت فایل را بررسی کنید.");
    }
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType.includes("spreadsheetml") ||
    mimeType.includes("excel")
  ) {
    try {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      let fullText = "";
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const csv = xlsx.utils.sheet_to_csv(worksheet);
        fullText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
      }
      return fullText;
    } catch (err) {
      console.error("Error reading Excel file:", err);
      throw new Error("خطا در خواندن فایل اکسل. لطفا فرمت فایل را بررسی کنید.");
    }
  }

  return "";
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "30mb" }));

// Initialize Google GenAI
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Helper function to call generateContent with retry logic and fallback models
async function generateContentWithRetry(options: {
  model: string;
  contents: any[];
  config?: any;
}, retries = 4, delay = 1000): Promise<any> {
  let lastError: any = null;
  const modelsSequence = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.1-flash-lite"];
  
  // If the initial model is in our sequence, align our starting index, otherwise default to 0
  let modelIndex = modelsSequence.indexOf(options.model);
  if (modelIndex === -1) {
    modelIndex = 0;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!ai) {
        throw new Error("SDK is not initialized");
      }
      
      // Select the current model based on the sequence index
      const currentModel = modelsSequence[modelIndex] || options.model;
      console.log(`[Attempt ${attempt}/${retries}] Requesting Gemini using model: ${currentModel}`);
      
      const response = await ai.models.generateContent({
        ...options,
        model: currentModel
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err.status || (err.error && err.error.status);
      const statusCode = err.statusCode || err.code || (err.error && err.error.code);
      console.warn(`[Attempt ${attempt}/${retries}] generateContent with model ${modelsSequence[modelIndex] || options.model} failed:`, err.message || err);
      
      const isUnavailable = status === "UNAVAILABLE" || statusCode === 503 || String(err).includes("503") || String(err).includes("UNAVAILABLE") || String(err).includes("demand");
      const isRateLimit = status === "RESOURCE_EXHAUSTED" || statusCode === 429 || String(err).includes("429") || String(err).includes("RESOURCE_EXHAUSTED");
      const isOverloaded = String(err).includes("overloaded") || String(err).includes("capacity");

      if ((isUnavailable || isRateLimit || isOverloaded) && attempt < retries) {
        // Fallback to the next model in sequence if available
        if (modelIndex < modelsSequence.length - 1) {
          modelIndex++;
          const nextModel = modelsSequence[modelIndex];
          console.log(`Model fallback triggered: switching to next stable model: ${nextModel}`);
          // Wait briefly before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          console.log(`Waiting ${delay}ms before retrying with the last model...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5; // incremental backoff
          continue;
        }
      }
      
      throw err;
    }
  }
  throw lastError;
}

// API Route for Smart Transcription / OCR
app.post("/api/transcribe", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "کلید API مربوط به Gemini تنظیم نشده است. لطفا آن را در بخش Settings > Secrets به عنوان GEMINI_API_KEY تنظیم نمایید.",
      });
    }

    const { imageBase64, mimeType, files } = req.body;
    const filesArray = files && Array.isArray(files) 
      ? files 
      : (imageBase64 && mimeType ? [{ imageBase64, mimeType }] : []);

    if (filesArray.length === 0) {
      return res.status(400).json({ error: "هیچ فایلی برای استخراج بارگذاری نشده است." });
    }

    const prompt = `
You are an expert Farsi legal document analyst and forensic accountant.
Analyze the attached document (which might be an image, PDF, Excel sheet, Word file, or text document) containing a handwritten expert session minute, a legal statement, a transaction list, or a page of an official expert report (نظریه کارشناسی رسمی دادگستری).

Transcribe and extract the contents precisely and organize them into the following structure:
1. Extract any header metadata (Expert name: سعید کبیریان, field: رشته حسابداری و حسابرسی, license: ۱۲۰۹۳۷۰۱۲۷, date, branch, caseNumber, etc.)
2. Identify and extract statements of the plaintiff (خواهان), defendant (خوانده), and lawyers (وکلا). Keep them completely word-for-word!
3. If there is a list or table of financial transactions, payments, deposits, or card-to-card transfers, extract them as an array of items with 'description', 'date', 'paymentMethod' (must be one of "کارت به کارت", "چک", "حواله", "نقدی", "سایر"), and 'amount' (in Rials, as a number).
4. If there is any mention of contracts, extract them into 'contracts' with subject, date, amount, and description.
5. If there is an expert opinion (نظریه کارشناسی) or other sections like "موضوع پرونده", "قرار کارشناسی", "نحوه بررسی اسناد و مدارک", or "محدودیت‌های رسیدگی", capture them as well.

Make sure the output is written in standard Farsi, keeping numbers in Farsi or converting them properly. 
`;

    const contents: any[] = [];
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      if (file.mimeType.startsWith("image/") || file.mimeType === "application/pdf") {
        contents.push({
          inlineData: {
            data: file.imageBase64,
            mimeType: file.mimeType,
          },
        });
      } else {
        const textContent = await getDocumentText(file.imageBase64, file.mimeType);
        contents.push({
          text: `Here is the extracted text or data from uploaded file #${i + 1} (Excel/Word/Txt):\n\n${textContent}`
        });
      }
    }
    contents.push({ text: prompt });

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: [
            "header",
            "caseSubject",
            "expertDecree",
            "investigationMethod",
            "limitations",
            "plaintiffStatements",
            "plaintiffStatementsDate",
            "defendantStatements",
            "defendantStatementsDate",
            "lawyerStatements",
            "lawyerStatementsTitle",
            "contracts",
            "transactions",
            "expertOpinion"
          ],
          properties: {
            header: {
              type: Type.OBJECT,
              required: ["expertName", "field", "licenseNumber", "mobileNumber", "courtName", "branch", "caseNumber", "plaintiff", "defendant"],
              properties: {
                expertName: { type: Type.STRING, description: "Name of the expert, e.g. سعید کبیریان" },
                field: { type: Type.STRING, description: "Field of expertise, e.g. رشته حسابداری و حسابرسی" },
                licenseNumber: { type: Type.STRING, description: "License number, e.g. ۱۲۰۹۳۷۰۱۲۷" },
                mobileNumber: { type: Type.STRING, description: "Mobile phone number, e.g. ۰۹۱۳۲۱۳۱۶۱۱" },
                date: { type: Type.STRING },
                number: { type: Type.STRING },
                attachment: { type: Type.STRING },
                courtName: { type: Type.STRING, description: "e.g. دادگاه صلح شهرستان" },
                branch: { type: Type.STRING, description: "e.g. شعبه ...." },
                caseNumber: { type: Type.STRING, description: "کلاسه پرونده" },
                plaintiff: { type: Type.STRING, description: "خواهان" },
                defendant: { type: Type.STRING, description: "خوانده" }
              }
            },
            caseSubject: { type: Type.STRING, description: "۱- موضوع پرونده" },
            expertDecree: { type: Type.STRING, description: "۲- قرار کارشناسی" },
            investigationMethod: { type: Type.STRING, description: "۳- نحوه بررسی اسناد و مدارک" },
            limitations: { type: Type.STRING, description: "۴- محدودیت‌های رسیدگی" },
            plaintiffStatements: { type: Type.STRING, description: "۵-۱- اظهارات دقیق خواهان" },
            plaintiffStatementsDate: { type: Type.STRING, description: "تاریخ اظهارات خواهان" },
            defendantStatements: { type: Type.STRING, description: "۵-۲- اظهارات دقیق خوانده" },
            defendantStatementsDate: { type: Type.STRING, description: "تاریخ اظهارات خوانده" },
            lawyerStatements: { type: Type.STRING, description: "۵-۴- اظهارات وکیل خواهان یا خوانده" },
            lawyerStatementsTitle: { type: Type.STRING, description: "عنوان بخش وکیل، مثلاً اظهارات وکیل خواهان" },
            contracts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "subject", "date", "amount", "description"],
                properties: {
                  id: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  date: { type: Type.STRING },
                  amount: { type: Type.NUMBER, description: "مبلغ قرارداد به ریال" },
                  description: { type: Type.STRING }
                }
              }
            },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "description", "date", "paymentMethod", "amount"],
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING },
                  date: { type: Type.STRING },
                  paymentMethod: { type: Type.STRING, description: "Must be: کارت به کارت, چک, حواله, نقدی, سایر" },
                  amount: { type: Type.NUMBER, description: "مبلغ تراکنش به ریال" }
                }
              }
            },
            expertOpinion: { type: Type.STRING, description: "۶- نظریه نهایی کارشناسی (محدود به حسابداری و حسابرسی)" }
          }
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: error.message || "خطا در پردازش تصویر و استخراج متن" });
  }
});

// API Route for Specific Smart OCR (Statements, Transactions, Contracts)
app.post("/api/transcribe-specific", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "کلید API مربوط به Gemini تنظیم نشده است. لطفا آن را در بخش Settings > Secrets به عنوان GEMINI_API_KEY تنظیم نمایید.",
      });
    }

    const { imageBase64, mimeType, type, files } = req.body;
    if (!type) {
      return res.status(400).json({ error: "نوع استخراج ارسال نشده است." });
    }

    let prompt = "";
    let responseSchema: any = {};

    if (type === "statements" || type === "plaintiff_statements" || type === "defendant_statements") {
      if (type === "plaintiff_statements") {
        prompt = `
You are an expert Farsi legal document analyst.
Analyze this document which contains the statements of the plaintiff (اظهارات خواهان).
Transcribe the statements of the plaintiff (خواهان) precisely, absolutely word-for-word, verbatim, without any omission, paraphrasing, abbreviation, summary, or editorial changes. 
مهم: استخراج باید عینا کلمه به کلمه و نعل به نعل باشد، بدون کوچک‌ترین تغییر در واژگان، دستور زبان، ادبیات، اشتباهات نگارشی یا حذف کلمات. تمام جملات باید دقیقاً همانطور که در سند هستند رونویسی شوند.
Return the transcription in standard Farsi, keeping any dates mentioned in the statements.
        `;
        responseSchema = {
          type: Type.OBJECT,
          required: ["plaintiffStatements", "plaintiffStatementsDate"],
          properties: {
            plaintiffStatements: { type: Type.STRING, description: "۵-۱- اظهارات دقیق، عینا کلمه به کلمه و نعل به نعل خواهان" },
            plaintiffStatementsDate: { type: Type.STRING, description: "تاریخ اظهارات خواهان" }
          }
        };
      } else if (type === "defendant_statements") {
        prompt = `
You are an expert Farsi legal document analyst.
Analyze this document which contains the statements of the defendant (اظهارات خوانده).
Transcribe the statements of the defendant (خوانده) precisely, absolutely word-for-word, verbatim, without any omission, paraphrasing, abbreviation, summary, or editorial changes.
مهم: استخراج باید عینا کلمه به کلمه و نعل به نعل باشد، بدون کوچک‌ترین تغییر در واژگان، دستور زبان، ادبیات، اشتباهات نگارشی یا حذف کلمات. تمام جملات باید دقیقاً همانطور که در سند هستند رونویسی شوند.
Return the transcription in standard Farsi, keeping any dates mentioned in the statements.
        `;
        responseSchema = {
          type: Type.OBJECT,
          required: ["defendantStatements", "defendantStatementsDate"],
          properties: {
            defendantStatements: { type: Type.STRING, description: "۵-۲- اظهارات دقیق، عینا کلمه به کلمه و نعل به نعل خوانده" },
            defendantStatementsDate: { type: Type.STRING, description: "تاریخ اظهارات خوانده" }
          }
        };
      } else {
        prompt = `
You are an expert Farsi legal document analyst.
Analyze this document which contains statements (اظهارات).
Transcribe the statements of the plaintiff (خواهان) and defendant (خوانده) precisely, absolutely word-for-word, verbatim, without any omission, paraphrasing, abbreviation, summary, or editorial changes.
مهم: استخراج باید عینا کلمه به کلمه و نعل به نعل باشد، بدون کوچک‌ترین تغییر در واژگان، دستور زبان، ادبیات، اشتباهات نگارشی یا حذف کلمات. تمام جملات باید دقیقاً همانطور که در سند هستند رونویسی شوند.
Return the transcription in standard Farsi, keeping any dates mentioned in the statements.
        `;
        responseSchema = {
          type: Type.OBJECT,
          required: ["plaintiffStatements", "plaintiffStatementsDate", "defendantStatements", "defendantStatementsDate"],
          properties: {
            plaintiffStatements: { type: Type.STRING, description: "۵-۱- اظهارات دقیق، عینا کلمه به کلمه و نعل به نعل خواهان" },
            plaintiffStatementsDate: { type: Type.STRING, description: "تاریخ اظهارات خواهان" },
            defendantStatements: { type: Type.STRING, description: "۵-۲- اظهارات دقیق، عینا کلمه به کلمه و نعل به نعل خوانده" },
            defendantStatementsDate: { type: Type.STRING, description: "تاریخ اظهارات خوانده" }
          }
        };
      }
    } else if (type === "transactions") {
      prompt = `
You are an expert forensic accountant.
Analyze this document which is a bank statement, card-to-card transfer receipt, check copy, or table of transactions.
Extract all transactions into a structured list.
For each transaction, extract:
- 'description': clear Farsi explanation of the transaction (e.g., 'واریز کارت به کارت بابت گوشی')
- 'date': the date of transaction (e.g., '۱۴۰۴/۰۲/۱۸')
- 'paymentMethod': must be one of "کارت به کارت", "چک", "حواله", "نقدی", "سایر"
- 'amount': the amount in Rials (must be a number, do not include commas or currency signs in the number value).
- 'sourceAccount': optional, the source account or card number (حساب/کارت مبدأ) if visible or mentioned (e.g., '۶۰۳۷۹۹۱۸۱۲۳۴۵۶۷۸' or '۱۲۳-۴۵۶-۷۸۹')
- 'destinationAccount': optional, the destination account or card number (حساب/کارت مقصد) if visible or mentioned (e.g., '۶۰۳۷۹۹۷۵۱۲۳۴۵۶۷۸')
      `;
      responseSchema = {
        type: Type.OBJECT,
        required: ["transactions"],
        properties: {
          transactions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["id", "description", "date", "paymentMethod", "amount"],
              properties: {
                id: { type: Type.STRING, description: "Unique string ID, e.g. 'tx_' + random" },
                description: { type: Type.STRING },
                date: { type: Type.STRING },
                paymentMethod: { type: Type.STRING, description: "Must be: کارت به کارت, چک, حواله, نقدی, سایر" },
                amount: { type: Type.NUMBER, description: "مبلغ تراکنش به ریال به صورت عدد" },
                sourceAccount: { type: Type.STRING, description: "حساب یا کارت مبدأ (اختیاری)" },
                destinationAccount: { type: Type.STRING, description: "حساب یا کارت مقصد (اختیاری)" }
              }
            }
          }
        }
      };
    } else if (type === "contracts") {
      prompt = `
You are an expert Farsi contract analyst.
Analyze this document which contains details of a contract, agreement, or memorandum between the parties.
Extract all contracts into a structured list.
For each contract, extract:
- 'subject': Farsi subject of the contract
- 'date': contract date
- 'amount': amount in Rials (must be a number)
- 'description': description or terms of the contract.
      `;
      responseSchema = {
        type: Type.OBJECT,
        required: ["contracts"],
        properties: {
          contracts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["id", "subject", "date", "amount", "description"],
              properties: {
                id: { type: Type.STRING },
                subject: { type: Type.STRING },
                date: { type: Type.STRING },
                amount: { type: Type.NUMBER, description: "مبلغ قرارداد به ریال به صورت عدد" },
                description: { type: Type.STRING }
              }
            }
          }
        }
      };
    } else {
      return res.status(400).json({ error: "نوع استخراج نامعتبر است." });
    }

    const filesArray = files && Array.isArray(files) 
      ? files 
      : (imageBase64 && mimeType ? [{ imageBase64, mimeType }] : []);

    if (filesArray.length === 0) {
      return res.status(400).json({ error: "هیچ فایلی برای استخراج بارگذاری نشده است." });
    }

    const contents: any[] = [];
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      if (file.mimeType.startsWith("image/") || file.mimeType === "application/pdf") {
        contents.push({
          inlineData: {
            data: file.imageBase64,
            mimeType: file.mimeType,
          },
        });
      } else {
        const textContent = await getDocumentText(file.imageBase64, file.mimeType);
        contents.push({
          text: `Here is the extracted text or data from uploaded file #${i + 1} (Excel/Word/Txt):\n\n${textContent}`
        });
      }
    }
    contents.push({ text: prompt });

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Specific OCR error:", error);
    res.status(500).json({ error: error.message || "خطا در استخراج اختصاصی سند" });
  }
});

// API Route for AI Report Assistant Editor
app.post("/api/edit-report", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "کلید API مربوط به Gemini تنظیم نشده است. لطفا آن را در بخش Settings > Secrets به عنوان GEMINI_API_KEY تنظیم نمایید.",
      });
    }

    const { doc, instruction } = req.body;
    if (!doc || !instruction) {
      return res.status(400).json({ error: "اطلاعات گزارش یا دستور ویرایش ارسال نشده است." });
    }

    const prompt = `
You are an expert Farsi judicial document editor and forensic accountant assistant.
The user wants to edit the current court-standard accounting expert report based on this natural language instruction: "${instruction}".

Here is the current report document state:
${JSON.stringify(doc, null, 2)}

Apply the user's instructions to edit the document state. Follow these strict rules:
1. Be extremely precise and change ONLY what the user asked for.
2. If the user asks to add, remove, or modify financial transactions, or add/edit details of transactions (such as card numbers, 'sourceAccount' (حساب مبدأ), 'destinationAccount' (حساب مقصد), or columns for account details), update the 'transactions' array properties. Ensure transaction 'amount' is always a number. Every transaction must have a unique ID.
3. If the user asks to add, remove, or modify contracts, update the 'contracts' array. Ensure contract 'amount' is always a number. Every contract must have a unique ID.
4. If they ask to edit statements, update 'plaintiffStatements' or 'defendantStatements'. Keep transcriptions precise and formal.
5. If they ask to rewrite, adjust, or generate the final expert opinion ('expertOpinion'), write it in elegant, formal, standard Farsi legal court style. It must be strictly focused on forensic accounting, fund-tracing, and ledger balancing. Do not include legal judgments, intents, or non-accounting matters.
6. Preserve all other fields that are NOT affected by the user's instructions. Keep the 'header' credentials intact unless explicitly asked to modify them.
7. Return the updated document state in 'updatedDoc' and a polite Farsi description of exactly what was modified in 'message'.
    `;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["updatedDoc", "message"],
          properties: {
            updatedDoc: {
              type: Type.OBJECT,
              required: [
                "header",
                "caseSubject",
                "expertDecree",
                "investigationMethod",
                "limitations",
                "plaintiffStatements",
                "plaintiffStatementsDate",
                "defendantStatements",
                "defendantStatementsDate",
                "lawyerStatements",
                "lawyerStatementsTitle",
                "contracts",
                "transactions",
                "expertOpinion"
              ],
              properties: {
                header: {
                  type: Type.OBJECT,
                  required: ["expertName", "field", "licenseNumber", "mobileNumber", "courtName", "branch", "caseNumber", "plaintiff", "defendant"],
                  properties: {
                    expertName: { type: Type.STRING },
                    field: { type: Type.STRING },
                    licenseNumber: { type: Type.STRING },
                    mobileNumber: { type: Type.STRING },
                    date: { type: Type.STRING },
                    number: { type: Type.STRING },
                    attachment: { type: Type.STRING },
                    courtName: { type: Type.STRING },
                    branch: { type: Type.STRING },
                    caseNumber: { type: Type.STRING },
                    plaintiff: { type: Type.STRING },
                    defendant: { type: Type.STRING }
                  }
                },
                caseSubject: { type: Type.STRING },
                expertDecree: { type: Type.STRING },
                investigationMethod: { type: Type.STRING },
                limitations: { type: Type.STRING },
                plaintiffStatements: { type: Type.STRING },
                plaintiffStatementsDate: { type: Type.STRING },
                defendantStatements: { type: Type.STRING },
                defendantStatementsDate: { type: Type.STRING },
                lawyerStatements: { type: Type.STRING },
                lawyerStatementsTitle: { type: Type.STRING },
                contracts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["id", "subject", "date", "amount", "description"],
                    properties: {
                      id: { type: Type.STRING },
                      subject: { type: Type.STRING },
                      date: { type: Type.STRING },
                      amount: { type: Type.NUMBER },
                      description: { type: Type.STRING }
                    }
                  }
                },
                transactions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["id", "description", "date", "paymentMethod", "amount"],
                    properties: {
                      id: { type: Type.STRING },
                      description: { type: Type.STRING },
                      date: { type: Type.STRING },
                      paymentMethod: { type: Type.STRING },
                      amount: { type: Type.NUMBER },
                      sourceAccount: { type: Type.STRING },
                      destinationAccount: { type: Type.STRING }
                    }
                  }
                },
                expertOpinion: { type: Type.STRING }
              }
            },
            message: { type: Type.STRING, description: "A friendly, professional Farsi message summarizing the edits performed." }
          }
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("AI edit error:", error);
    res.status(500).json({ error: error.message || "خطا در ویرایش هوشمند گزارش توسط هوش مصنوعی" });
  }
});

// Configure Vite middleware or static serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
