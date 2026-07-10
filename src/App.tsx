import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Download,
  Printer,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  FileCheck,
  Briefcase,
  Calendar,
  Phone,
  Sliders,
  Eye,
  AlertCircle,
  Info,
  Scale,
  DollarSign,
  User,
  ShieldCheck,
  HelpCircle,
  Send,
  Save,
  Database,
  FilePlus,
  FileSpreadsheet,
  Mic,
  MicOff,
  MessageSquare,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ExpertReport, ContractItem, TransactionItem } from "./types";
import { defaultDocument } from "./data/defaultDoc";
import { sampleReport1, sampleReport2 } from "./data/sampleReports";
import { generateDocx } from "./utils/docxGenerator";

// Simple Persian Number to Words Converter helper for financial reports
const convertNumToPersianWords = (num: number): string => {
  if (num === 0) return "صفر";
  
  const yekan = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
  const dahgan = ["", "ده", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
  const dahYek = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هیجده", "نوزده"];
  const sadgan = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
  const stages = ["", "هزار", "میلیون", "میلیارد"];

  const chunkToWords = (c: number): string => {
    let result = "";
    const s = Math.floor(c / 100);
    const d = Math.floor((c % 100) / 10);
    const y = c % 10;

    if (s > 0) {
      result += sadgan[s];
    }
    if (d > 0) {
      if (result !== "") result += " و ";
      if (d === 1) {
        result += dahYek[y];
        return result;
      } else {
        result += dahgan[d];
      }
    }
    if (y > 0) {
      if (result !== "") result += " و ";
      result += yekan[y];
    }
    return result;
  };

  let word = "";
  let tempNum = num;
  let stageIdx = 0;

  while (tempNum > 0) {
    const chunk = tempNum % 1000;
    if (chunk > 0) {
      const chunkWord = chunkToWords(chunk);
      const stageName = stages[stageIdx];
      const part = chunkWord + (stageName !== "" ? " " + stageName : "");
      word = part + (word !== "" ? " و " + word : "");
    }
    tempNum = Math.floor(tempNum / 1000);
    stageIdx++;
  }

  return word.trim() + " ریال";
};

interface UploadedFile {
  id: string;
  file: File;
  base64Data: string;
  resolvedMime: string;
  preview: string | null;
}

export default function App() {
  const [doc, setDoc] = useState<ExpertReport>(defaultDocument);
  const [activeTab, setActiveTab] = useState<"general" | "statements" | "financials" | "sections" | "ocr">("financials");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  // File Upload states (General OCR)
  const [dragActive, setDragActive] = useState(false);
  const [generalFiles, setGeneralFiles] = useState<UploadedFile[]>([]);

  // Specific OCR Upload states
  const [specificLoading, setSpecificLoading] = useState<"plaintiff_statements" | "defendant_statements" | "statements" | "transactions" | "contracts" | null>(null);
  const [plaintiffStatementsFiles, setPlaintiffStatementsFiles] = useState<UploadedFile[]>([]);
  const [defendantStatementsFiles, setDefendantStatementsFiles] = useState<UploadedFile[]>([]);
  const [transactionsFiles, setTransactionsFiles] = useState<UploadedFile[]>([]);
  const [contractsFiles, setContractsFiles] = useState<UploadedFile[]>([]);

  // AI Transcribing states
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // AI Assistant Chat states
  const [assistantQuery, setAssistantQuery] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: "user" | "assistant", text: string }>>([
    {
      role: "assistant",
      text: "سلام! من دستیار هوشمند ویرایش گزارش کارشناسی شما هستم. شما می‌توانید هر دستوری را به زبان ساده بگویید یا بنویسید؛ مثلاً:\n- «مبلغ قرارداد اول را به ۲ میلیارد ریال تغییر بده»\n- «یک تراکنش جدید به مبلغ ۴۵ میلیون تومان اضافه کن بابت مشارکت خرید آیفون»\n- «نظریه کارشناسی را طوری بازنویسی کن که بدهکاری نهایی خوانده به مبلغ ۸۲ میلیون تومان تاکید شود»\n- «مشخصات شاکی را به مهران احمدی تغییر بده»"
    }
  ]);

  // Speech Recognition (Voice Input)
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("مرورگر شما از قابلیت تایپ صوتی پشتیبانی نمی‌کند. لطفاً از گوگل کروم یا مایکروسافت اج استفاده کنید.", "error");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fa-IR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      showToast("در حال شنیدن صدای شما... سخن بفرمایید.", "info");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAssistantQuery(transcript);
      setIsListening(false);
      showToast("دستور صوتی با موفقیت تایپ شد.", "success");
    };

    recognition.onerror = (event: any) => {
      console.error(event);
      setIsListening(false);
      showToast("خطایی در دریافت صدا رخ داد. لطفاً مجوز دسترسی به میکروفون را بررسی کنید.", "error");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Local Storage Saved Reports states
  const [savedReports, setSavedReports] = useState<Array<{ id: string, title: string, dateSaved: string, data: ExpertReport }>>([]);
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Controlled preset dropdown selection state
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // Custom Toast and Confirmation Modal states (fixes iframe browser blocks)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customized AI steps emphasizing Forensic Accounting OCR
  const loadingSteps = [
    "در حال بارگذاری تصویر فیش بانکی / دست‌نویس صورتجلسه...",
    "ارتباط ایمن با سرور پردازشی هوش مصنوعی کارگاه دادگستری...",
    "تحلیل بافت تصویر، نویزگیری و شناسایی خطوط دست‌نویس فارسی...",
    "استخراج کلمه به کلمه اظهارات خواهان و خوانده...",
    "شناسایی ساختار جداول بانکی، کارت به کارت‌ها و اطلاعات واریز/برداشت...",
    "استخراج مبالغ ریالی، تاریخ‌های چک صیادی و ارقام فاکتورها...",
    "تطبیق اطلاعات مالی با استانداردهای رسمی حسابرسی کارشناسی...",
    "بارگذاری نهایی گزارش کارشناسی فرمت‌بندی شده در پنل ویرایشگر..."
  ];

  // Load saved reports from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("judicial_expert_reports");
    if (saved) {
      try {
        setSavedReports(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved reports:", e);
      }
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Handle header field edits
  const handleHeaderChange = (field: keyof typeof doc.header, value: string) => {
    setDoc((prev) => ({
      ...prev,
      header: { ...prev.header, [field]: value }
    }));
  };

  // Handle report sections change
  const handleSectionChange = (field: keyof Omit<ExpertReport, "header" | "contracts" | "transactions">, value: string) => {
    setDoc((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // --- Transactions Management ---
  const handleAddTransaction = () => {
    const newTx: TransactionItem = {
      id: `tx_${Date.now()}`,
      description: "واریز کارت به کارت بابت خرید گوشی همراه",
      date: "۱۴۰۴/۰۲/۱۸",
      paymentMethod: "کارت به کارت",
      amount: 50000000
    };
    setDoc((prev) => ({
      ...prev,
      transactions: [...prev.transactions, newTx]
    }));
  };

  const handleTransactionChange = (id: string, field: keyof TransactionItem, value: any) => {
    setDoc((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx) =>
        tx.id === id ? { ...tx, [field]: value } : tx
      )
    }));
  };

  const handleDeleteTransaction = (id: string) => {
    setDoc((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((tx) => tx.id !== id)
    }));
  };

  // --- Contracts Management ---
  const handleAddContract = () => {
    const newContract: ContractItem = {
      id: `c_${Date.now()}`,
      subject: "قرارداد مشارکت مدنی و تامین گوشی همراه",
      date: "۱۴۰۴/۰۲/۱۵",
      amount: 100000000,
      description: "تعهد خوانده به بازپرداخت اصل سرمایه"
    };
    setDoc((prev) => ({
      ...prev,
      contracts: [...prev.contracts, newContract]
    }));
  };

  const handleContractChange = (id: string, field: keyof ContractItem, value: any) => {
    setDoc((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    }));
  };

  const handleDeleteContract = (id: string) => {
    setDoc((prev) => ({
      ...prev,
      contracts: prev.contracts.filter((c) => c.id !== id)
    }));
  };

  // Copy structured text to clipboard
  const handleCopyToClipboard = () => {
    let fullText = `بسمه تعالی\n\n`;
    fullText += `گزارش کارشناسی رسمی دادگستری\n`;
    fullText += `کارشناس: ${doc.header.expertName}\n`;
    fullText += `رشته: ${doc.header.field}\n`;
    fullText += `پروانه کارشناسی: ${doc.header.licenseNumber}\n`;
    fullText += `تلفن همراه: ${doc.header.mobileNumber}\n`;
    fullText += `کلاسه پرونده: ${doc.header.caseNumber}\n`;
    fullText += `مرجع محترم: ${doc.header.branch} ${doc.header.courtName}\n`;
    fullText += `\n-------------------------------------------------\n\n`;
    
    fullText += `۱- موضوع پرونده:\n${doc.caseSubject}\n\n`;
    fullText += `۲- قرار کارشناسی:\n${doc.expertDecree}\n\n`;
    fullText += `۳- نحوه بررسی اسناد و مدارک:\n${doc.investigationMethod}\n\n`;
    fullText += `۴- محدودیت‌های رسیدگی:\n${doc.limitations}\n\n`;
    
    fullText += `۵- شرح بررسی‌های کارشناسی براساس مفاد قرار کارشناسی:\n`;
    fullText += `۵-۱- اظهارات خواهان (مورخ ${doc.plaintiffStatementsDate}):\n${doc.plaintiffStatements}\n\n`;
    fullText += `۵-۲- اظهارات خوانده (مورخ ${doc.defendantStatementsDate}):\n${doc.defendantStatements}\n\n`;
    
    fullText += `۵-۳- جدول مراودات مالی و واریزها:\n`;
    doc.transactions.forEach((tx, idx) => {
      fullText += `${idx + 1}. شرح: ${tx.description} | تاریخ: ${tx.date} | روش: ${tx.paymentMethod} | مبلغ: ${tx.amount.toLocaleString("fa-IR")} ریال\n`;
    });
    const totalTx = doc.transactions.reduce((sum, tx) => sum + tx.amount, 0);
    fullText += `جمع کل مراودات مالی: ${totalTx.toLocaleString("fa-IR")} ریال (${convertNumToPersianWords(totalTx)})\n\n`;

    if (doc.contracts.length > 0) {
      fullText += `قراردادهای فی‌مابین طرفین:\n`;
      doc.contracts.forEach((c, idx) => {
        fullText += `${idx + 1}. موضوع: ${c.subject} | تاریخ: ${c.date} | مبلغ: ${c.amount.toLocaleString("fa-IR")} ریال\n`;
      });
      fullText += `\n`;
    }

    fullText += `۵-۴- ${doc.lawyerStatementsTitle}:\n${doc.lawyerStatements}\n\n`;
    fullText += `۶- نظریه نهایی کارشناسی (صرفاً در حیطه تخصصی حسابداری و حسابرسی):\n${doc.expertOpinion}\n\n`;
    fullText += `اظهار نظر اینجانب صرفا اظهار نظر کارشناسی بوده و اتخاذ تصمیم لازم در صلاحیت آن مقام محترم قضائی می باشد.\n\n`;
    fullText += `با تقدیم احترام مجدد، ${doc.header.expertName}`;

    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Reset to default document
  const handleReset = () => {
    askConfirmation(
      "بازنشانی گزارش نمونه اولیه",
      "آیا مطمئن هستید؟ با تایید این بخش، گزارش فعلی شما پاک شده و مجدداً گزارش نمونه مسعود علیه سهیل بارگذاری خواهد شد.",
      () => {
        setResetting(true);
        setSelectedPreset("default");
        setTimeout(() => {
          setDoc(defaultDocument);
          setResetting(false);
          setError(null);
          showToast("گزارش نمونه اولیه با موفقیت بارگذاری شد.");
        }, 500);
      }
    );
  };

  // Load predefined high-fidelity presets matching user uploaded samples
  const handleLoadPreset = (presetName: string) => {
    if (!presetName) return;
    setResetting(true);
    setTimeout(() => {
      if (presetName === "sample1") {
        setDoc(sampleReport1);
        showToast("نمونه گزارش اول (پوشاک دادور) بارگذاری شد.");
      } else if (presetName === "sample2") {
        setDoc(sampleReport2);
        showToast("نمونه گزارش دوم (شراکت چاه شاه‌نظری) بارگذاری شد.");
      } else if (presetName === "default") {
        setDoc(defaultDocument);
        showToast("گزارش پایه پیش‌فرض بارگذاری شد.");
      }
      setResetting(false);
      setError(null);
    }, 400);
  };

  // Start raw blank report keeping expert details
  const handleStartNewReport = () => {
    askConfirmation(
      "شروع مجدد و ایجاد گزارش خام",
      "آیا از ایجاد گزارش جدید اطمینان دارید؟ با تایید این بخش، تمامی فیلدهای مربوط به پرونده فعلی کاملاً خالی و ریست خواهند شد (کد کارشناسی شما جهت سهولت کار حفظ می‌گردد).",
      () => {
        setDoc({
          header: {
            expertName: doc.header.expertName || "سعید کبیریان",
            field: doc.header.field || "رشته حسابداری و حسابرسی",
            licenseNumber: doc.header.licenseNumber || "۱۲۰۹۳۷۰۱۲۷",
            mobileNumber: doc.header.mobileNumber || "۰۹۱۳۲۱۳۱۶۱۱",
            date: new Date().toLocaleDateString("fa-IR"),
            number: "",
            attachment: "ندارد",
            courtName: "",
            branch: "",
            caseNumber: "",
            plaintiff: "",
            defendant: ""
          },
          caseSubject: "",
          expertDecree: "",
          investigationMethod: "",
          limitations: "",
          plaintiffStatements: "",
          plaintiffStatementsDate: new Date().toLocaleDateString("fa-IR"),
          defendantStatements: "",
          defendantStatementsDate: new Date().toLocaleDateString("fa-IR"),
          lawyerStatementsTitle: "اظهارات وکلای طرفین",
          lawyerStatements: "",
          contracts: [],
          transactions: [],
          claimedGoods: [],
          reconciliationRows: [],
          chequeRows: [],
          scenarios: [],
          expertOpinion: ""
        });
        setSelectedPreset("");
        setGeneralFiles([]);
        setPlaintiffStatementsFiles([]);
        setDefendantStatementsFiles([]);
        setTransactionsFiles([]);
        setContractsFiles([]);
        setError(null);
        setLoading(false);
        setSpecificLoading(null);
        showToast("گزارش جدید و خام با فیلدهای خالی آغاز شد.", "info");
      }
    );
  };

  // Saved Reports LocalStorage Handlers
  const saveReport = (titleToUse?: string) => {
    const title = titleToUse || saveTitle || `گزارش کلاسه ${doc.header.caseNumber || "جدید"} - خواهان: ${doc.header.plaintiff || "نامشخص"}`;
    const newReport = {
      id: `report_${Date.now()}`,
      title: title,
      dateSaved: new Date().toLocaleDateString("fa-IR") + " - " + new Date().toLocaleTimeString("fa-IR"),
      data: doc
    };
    const updated = [newReport, ...savedReports];
    setSavedReports(updated);
    localStorage.setItem("judicial_expert_reports", JSON.stringify(updated));
    setSaveTitle("");
    setShowSaveDialog(false);
    showToast(`گزارش «${title}» با موفقیت ذخیره شد.`, "success");
  };

  const loadReport = (reportData: ExpertReport) => {
    askConfirmation(
      "بارگذاری گزارش ذخیره‌شده",
      "آیا مطمئن هستید؟ با بارگذاری این گزارش، اطلاعات و تغییرات فعلی شما بازنویسی خواهد شد.",
      () => {
        setDoc(reportData);
        setSelectedPreset("");
        showToast("گزارش با موفقیت بارگذاری شد.");
      }
    );
  };

  const deleteReport = (id: string, title: string) => {
    askConfirmation(
      "حذف گزارش ذخیره‌شده",
      `آیا از حذف گزارش «${title}» اطمینان دارید؟ این عملیات غیرقابل بازگشت است.`,
      () => {
        const updated = savedReports.filter(r => r.id !== id);
        setSavedReports(updated);
        localStorage.setItem("judicial_expert_reports", JSON.stringify(updated));
        showToast("گزارش با موفقیت حذف شد.", "info");
      }
    );
  };

  const exportBackupJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedReports, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `پشتیبان_کامل_گزارشات_کارشناسی.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("فایل پشتیبان با موفقیت دانلود شد.");
  };

  const importBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            const merged = [...imported, ...savedReports];
            setSavedReports(merged);
            localStorage.setItem("judicial_expert_reports", JSON.stringify(merged));
            showToast("پشتیبان گزارشات با موفقیت وارد و ادغام شد.", "success");
          } else {
            showToast("فرمت فایل وارد شده معتبر نیست.", "error");
          }
        } catch (error) {
          showToast("خطا در خواندن فایل پشتیبان.", "error");
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const getMimeTypeByExtension = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc': return 'application/msword';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'xls': return 'application/vnd.ms-excel';
      case 'txt': return 'text/plain';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      default: return 'application/octet-stream';
    }
  };

  // Process selected or dropped files into base64 structure
  const processFiles = async (files: File[]): Promise<UploadedFile[]> => {
    const allowedTypes = [
      "image/png", "image/jpeg", "image/jpg", "image/webp",
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"
    ];

    const processed: UploadedFile[] = [];

    for (const file of files) {
      const resolvedMime = file.type || getMimeTypeByExtension(file.name);
      const isAllowed = resolvedMime.startsWith("image/") || allowedTypes.includes(resolvedMime);

      if (!isAllowed) {
        showToast(`فایل ${file.name} معتبر نیست. لطفاً فقط تصویر، PDF، ورد، اکسل یا متنی بارگذاری کنید.`, "error");
        continue;
      }

      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => reject(e);
        });
        reader.readAsDataURL(file);
        const result = await base64Promise;
        const base64Data = result.split(",")[1];
        const preview = resolvedMime.startsWith("image/") ? result : null;

        processed.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          file,
          base64Data,
          resolvedMime,
          preview
        });
      } catch (err) {
        console.error("Error reading file:", file.name, err);
        showToast(`خطا در خواندن فایل ${file.name}`, "error");
      }
    }

    return processed;
  };

  // Specific OCR Upload Queue Handlers
  const handleSpecificFileSelect = async (
    type: "plaintiff_statements" | "defendant_statements" | "statements" | "transactions" | "contracts",
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    const processed = await processFiles(Array.from(files));
    if (type === "plaintiff_statements") {
      setPlaintiffStatementsFiles((prev) => [...prev, ...processed]);
    } else if (type === "defendant_statements") {
      setDefendantStatementsFiles((prev) => [...prev, ...processed]);
    } else if (type === "statements") {
      // support fallback
      setPlaintiffStatementsFiles((prev) => [...prev, ...processed]);
    } else if (type === "transactions") {
      setTransactionsFiles((prev) => [...prev, ...processed]);
    } else if (type === "contracts") {
      setContractsFiles((prev) => [...prev, ...processed]);
    }
    showToast(`${processed.length} فایل جدید به لیست اضافه شد.`, "info");
  };

  const runSpecificOCR = async (
    type: "plaintiff_statements" | "defendant_statements" | "statements" | "transactions" | "contracts"
  ) => {
    let queue: UploadedFile[] = [];
    if (type === "plaintiff_statements") {
      queue = plaintiffStatementsFiles;
    } else if (type === "defendant_statements") {
      queue = defendantStatementsFiles;
    } else if (type === "statements") {
      queue = plaintiffStatementsFiles.length > 0 ? plaintiffStatementsFiles : defendantStatementsFiles;
    } else if (type === "transactions") {
      queue = transactionsFiles;
    } else if (type === "contracts") {
      queue = contractsFiles;
    }

    if (queue.length === 0) {
      showToast("لطفاً ابتدا حداقل یک فایل بارگذاری کنید.", "error");
      return;
    }

    setSpecificLoading(type);
    setError(null);

    try {
      const filesPayload = queue.map((f) => ({
        imageBase64: f.base64Data,
        mimeType: f.resolvedMime
      }));

      const response = await fetch("/api/transcribe-specific", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filesPayload,
          type: type
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "خطا در پردازش هوش مصنوعی سرور.");
      }

      if (type === "plaintiff_statements") {
        setDoc((prev) => ({
          ...prev,
          plaintiffStatements: data.plaintiffStatements || prev.plaintiffStatements,
          plaintiffStatementsDate: data.plaintiffStatementsDate || prev.plaintiffStatementsDate,
        }));
        showToast("اظهارات خواهان با موفقیت از روی اسناد استخراج و درج گردید.", "success");
        setPlaintiffStatementsFiles([]); // Clear queue after success
      } else if (type === "defendant_statements") {
        setDoc((prev) => ({
          ...prev,
          defendantStatements: data.defendantStatements || prev.defendantStatements,
          defendantStatementsDate: data.defendantStatementsDate || prev.defendantStatementsDate,
        }));
        showToast("اظهارات خوانده با موفقیت از روی اسناد استخراج و درج گردید.", "success");
        setDefendantStatementsFiles([]); // Clear queue after success
      } else if (type === "statements") {
        setDoc((prev) => ({
          ...prev,
          plaintiffStatements: data.plaintiffStatements || prev.plaintiffStatements,
          plaintiffStatementsDate: data.plaintiffStatementsDate || prev.plaintiffStatementsDate,
          defendantStatements: data.defendantStatements || prev.defendantStatements,
          defendantStatementsDate: data.defendantStatementsDate || prev.defendantStatementsDate,
        }));
        showToast("اظهارات طرفین با موفقیت از روی اسناد استخراج و درج گردید.", "success");
        setPlaintiffStatementsFiles([]);
        setDefendantStatementsFiles([]);
      } else if (type === "transactions") {
        if (data.transactions && data.transactions.length > 0) {
          const txsWithIds = data.transactions.map((tx: any) => ({
            ...tx,
            id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }));
          setDoc((prev) => ({
            ...prev,
            transactions: [...prev.transactions, ...txsWithIds]
          }));
          showToast(`${txsWithIds.length} تراکنش مالی جدید استخراج و به جدول اضافه شد.`, "success");
          setTransactionsFiles([]); // Clear queue after success
        } else {
          showToast("تراکنشی در فایل‌های بارگذاری شده یافت نشد.", "info");
        }
      } else if (type === "contracts") {
        if (data.contracts && data.contracts.length > 0) {
          const contractsWithIds = data.contracts.map((c: any) => ({
            ...c,
            id: c.id || `c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }));
          setDoc((prev) => ({
            ...prev,
            contracts: [...prev.contracts, ...contractsWithIds]
          }));
          showToast(`${contractsWithIds.length} قرارداد جدید استخراج و به لیست افزوده شد.`, "success");
          setContractsFiles([]); // Clear queue after success
        } else {
          showToast("قراردادی در فایل‌های بارگذاری شده یافت نشد.", "info");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "خطا در استخراج اطلاعات و ارتباط با هوش مصنوعی.");
    } finally {
      setSpecificLoading(null);
    }
  };

  // AI Assistant Command submit
  const handleAssistantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantQuery.trim()) return;

    const userQuery = assistantQuery;
    setAssistantQuery("");
    setAssistantMessages(prev => [...prev, { role: "user", text: userQuery }]);
    setAssistantLoading(true);

    try {
      const response = await fetch("/api/edit-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc: doc,
          instruction: userQuery
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "خطا در ارتباط با دستیار ویرایشگر.");
      }

      setDoc(data.updatedDoc);
      setAssistantMessages(prev => [...prev, { role: "assistant", text: data.message }]);
    } catch (err: any) {
      console.error(err);
      setAssistantMessages(prev => [...prev, { role: "assistant", text: `متأسفانه خطایی رخ داد: ${err.message}` }]);
    } finally {
      setAssistantLoading(false);
    }
  };

  // Drag & Drop (General OCR)
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const processed = await processFiles(Array.from(e.dataTransfer.files));
      setGeneralFiles((prev) => [...prev, ...processed]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const processed = await processFiles(Array.from(e.target.files));
      setGeneralFiles((prev) => [...prev, ...processed]);
    }
  };

  // Call the server API to transcribe image using Gemini 3.5
  const handleTranscribe = async () => {
    if (generalFiles.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const filesPayload = generalFiles.map((f) => ({
        imageBase64: f.base64Data,
        mimeType: f.resolvedMime
      }));

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filesPayload
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطای ناشناخته در پردازش تصویر روی سرور.");
      }

      // Map parsed data into the report
      setDoc((prev) => ({
        ...prev,
        header: {
          expertName: data.header?.expertName || prev.header.expertName,
          field: data.header?.field || prev.header.field,
          licenseNumber: data.header?.licenseNumber || prev.header.licenseNumber,
          mobileNumber: data.header?.mobileNumber || prev.header.mobileNumber,
          date: data.header?.date || prev.header.date,
          number: data.header?.number || prev.header.number,
          attachment: data.header?.attachment || prev.header.attachment,
          courtName: data.header?.courtName || prev.header.courtName,
          branch: data.header?.branch || prev.header.branch,
          caseNumber: data.header?.caseNumber || prev.header.caseNumber,
          plaintiff: data.header?.plaintiff || prev.header.plaintiff,
          defendant: data.header?.defendant || prev.header.defendant
        },
        caseSubject: data.caseSubject || prev.caseSubject,
        expertDecree: data.expertDecree || prev.expertDecree,
        investigationMethod: data.investigationMethod || prev.investigationMethod,
        limitations: data.limitations || prev.limitations,
        plaintiffStatements: data.plaintiffStatements || prev.plaintiffStatements,
        plaintiffStatementsDate: data.plaintiffStatementsDate || prev.plaintiffStatementsDate,
        defendantStatements: data.defendantStatements || prev.defendantStatements,
        defendantStatementsDate: data.defendantStatementsDate || prev.defendantStatementsDate,
        lawyerStatementsTitle: data.lawyerStatementsTitle || prev.lawyerStatementsTitle,
        lawyerStatements: data.lawyerStatements || prev.lawyerStatements,
        contracts: data.contracts && data.contracts.length > 0 ? data.contracts : prev.contracts,
        transactions: data.transactions && data.transactions.length > 0 ? data.transactions : prev.transactions,
        expertOpinion: data.expertOpinion || prev.expertOpinion
      }));

      setActiveTab("financials");
      setGeneralFiles([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "خطا در برقراری ارتباط با سرور یا پردازش تصویر توسط هوش مصنوعی کارشناس.");
    } finally {
      setLoading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Calculated variables
  const totalTransactionsAmount = doc.transactions.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Header section (Non-printable) */}
      <header className="bg-slate-950 text-white border-b border-slate-800 shadow-md py-4 px-6 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 text-white p-2.5 rounded-xl shadow-lg shadow-teal-900/20">
              <Scale className="w-6 h-6 text-slate-100" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                دستیار کارشناس رسمی دادگستری (حسابداری و حسابرسی)
                <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-normal">
                  ویژه پرونده‌های صلح و حقوقی
                </span>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                تولید گزارش کارشناسی مکتوب مطابق با الگوی دادگستری اصفهان به همراه استخراج دست‌نویس طرفین و محاسبه مراودات مالی
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium transition duration-150 border border-slate-700/80 shadow-sm"
              title="کپی کردن متن کامل گزارش به حافظه"
            >
              {copied ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "کپی شد" : "کپی متن گزارش"}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium transition duration-150 border border-slate-700/80 shadow-sm"
              title="چاپ مستقیم گزارش کارشناسی"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ گزارش (PDF)</span>
            </button>

            <button
              onClick={() => generateDocx(doc)}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition duration-150 shadow-md shadow-teal-900/10 hover:scale-[1.01] transform"
              title="دانلود فایل نهایی ورد مطابق با دست‌نویس و سربرگ خام کارشناسی"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل ورد (Docx)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Requirement-based Warning Checklist */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start gap-4 shadow-sm no-print">
          <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1 text-xs md:text-sm leading-relaxed">
            <h4 className="font-bold text-white text-sm md:text-base mb-1 flex items-center gap-2">
              بررسی انطباق گزارش کارشناسی با الزامات قضایی پرونده:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 mt-2 text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                <span>بهره‌گیری کامل از الگو، فونت B Nazanin و حاشیه‌بندی دو خطه فایل خام</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                <span>درج کلمه به کلمه و دقیق تمامی اظهارات مکتوب خواهان و خوانده</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                <span>جدول‌بندی منظم قراردادها و تمامی مراودات مالی (کارت به کارت، چک، حواله)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                <span className="font-semibold text-teal-300">تنظیم نظر کارشناسی صرفاً در حیطه مالی و حسابداری (فارغ از مسائل غیرتخصصی)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">آرشیو نمونه گزارش‌های سعید کبیریان (آپلود شده):</h4>
              <p className="text-xs text-slate-400 mt-0.5">بارگذاری مستقیم پرونده‌های واقعی و محاسبات انجام شده جهت ارزیابی کارایی سامانه</p>
            </div>
          </div>
          <select
            onChange={(e) => {
              setSelectedPreset(e.target.value);
              handleLoadPreset(e.target.value);
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-teal-400 font-bold focus:outline-none focus:border-teal-500 cursor-pointer hover:bg-slate-950 transition duration-150 w-full md:w-auto text-right font-sans"
            value={selectedPreset}
          >
            <option value="" disabled>--- انتخاب گزارش نمونه کارشناسی ---</option>
            <option value="default">گزارش پایه پیش‌فرض (خرید گوشی تلفن همراه - مسعود علیه سهیل)</option>
            <option value="sample1">نمونه ۱: دادور علیه احمدی (موضوع مطالبه وجه خرید پوشاک و کفش - ۷۹ میلیون تومان)</option>
            <option value="sample2">نمونه ۲: شاه‌نظری علیه نصر (موضوع شراکت چاه کشاورزی ده ساله - ۵۰۰ میلیون تومان)</option>
          </select>
        </div>

        {/* Mobile View Toggle */}
        <div className="lg:hidden flex bg-slate-800 border border-slate-700 rounded-xl p-1 no-print shadow-sm">
          <button
            onClick={() => setMobileView("edit")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition ${
              mobileView === "edit" ? "bg-slate-700 text-white shadow-md" : "text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            <Sliders className="w-4 h-4" />
            ویرایش اطلاعات و ارقام
          </button>
          <button
            onClick={() => setMobileView("preview")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition ${
              mobileView === "preview" ? "bg-slate-700 text-white shadow-md" : "text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            <Eye className="w-4 h-4" />
            پیش‌نمایش سند رسمی (A4)
          </button>
        </div>

        {/* Dual Pane Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* EDITOR COLUMN - RIGHT SIDE */}
          <div className={`lg:col-span-5 flex flex-col gap-5 no-print ${mobileView === "edit" ? "block" : "hidden lg:block"}`}>
            
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-lg overflow-hidden">
              {/* Header of Control Panel */}
              <div className="bg-slate-900 border-b border-slate-700/60 px-5 py-4 flex justify-between items-center">
                <h2 className="font-bold text-slate-100 flex items-center gap-2 text-sm md:text-base">
                  <Sliders className="w-5 h-5 text-teal-400" />
                  پنل تخصصی تدوین گزارش کارشناس
                </h2>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleStartNewReport}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition py-1 px-2.5 bg-slate-800 hover:bg-slate-950 rounded-lg border border-slate-700 font-semibold"
                    title="شروع گزارش‌نویسی جدید (خام و خالی)"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    شروع مجدد
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition py-1 px-2.5 bg-slate-800 hover:bg-slate-950 rounded-lg border border-slate-700"
                    title="بازنشانی گزارش به نمونه پیش‌فرض سعید کبیریان"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
                    نمونه اولیه
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-700 bg-slate-900/50 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("financials")}
                  className={`flex-1 py-3 px-2 text-xs font-semibold transition border-b-2 text-center whitespace-nowrap ${
                    activeTab === "financials"
                      ? "border-teal-500 text-teal-400 bg-slate-800"
                      : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                  }`}
                >
                  تراکنش‌ها و قراردادها ({doc.transactions.length})
                </button>
                <button
                  onClick={() => setActiveTab("statements")}
                  className={`flex-1 py-3 px-2 text-xs font-semibold transition border-b-2 text-center whitespace-nowrap ${
                    activeTab === "statements"
                      ? "border-teal-500 text-teal-400 bg-slate-800"
                      : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                  }`}
                >
                  اظهارات طرفین (کلمه به کلمه)
                </button>
                <button
                  onClick={() => setActiveTab("sections")}
                  className={`flex-1 py-3 px-2 text-xs font-semibold transition border-b-2 text-center whitespace-nowrap ${
                    activeTab === "sections"
                      ? "border-teal-500 text-teal-400 bg-slate-800"
                      : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                  }`}
                >
                  بخش‌های گزارش (۱ تا ۶)
                </button>
                <button
                  onClick={() => setActiveTab("general")}
                  className={`flex-1 py-3 px-2 text-xs font-semibold transition border-b-2 text-center whitespace-nowrap ${
                    activeTab === "general"
                      ? "border-teal-500 text-teal-400 bg-slate-800"
                      : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/40"
                  }`}
                >
                  مشخصات عمومی پرونده
                </button>
                <button
                  onClick={() => setActiveTab("ocr")}
                  className={`flex-1 py-3 px-2 text-xs font-semibold text-teal-400 transition border-b-2 text-center flex items-center justify-center gap-1 bg-teal-500/5 hover:bg-teal-500/10 whitespace-nowrap ${
                    activeTab === "ocr"
                      ? "border-teal-500 text-teal-400 bg-slate-800"
                      : "border-transparent hover:text-teal-300"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  استخراج هوشمند
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-5">
                <AnimatePresence mode="wait">
                  
                  {/* TAB: GENERAL METADATA */}
                  {activeTab === "general" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">کارشناس رسمی</label>
                          <input
                            type="text"
                            value={doc.header.expertName}
                            onChange={(e) => handleHeaderChange("expertName", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm transition focus:border-teal-500 focus:bg-slate-950 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">رشته کارشناسی</label>
                          <input
                            type="text"
                            value={doc.header.field}
                            onChange={(e) => handleHeaderChange("field", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm transition focus:border-teal-500 focus:bg-slate-950 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">شماره پروانه</label>
                          <input
                            type="text"
                            value={doc.header.licenseNumber}
                            onChange={(e) => handleHeaderChange("licenseNumber", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm transition focus:border-teal-500 focus:bg-slate-950 text-white text-left font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">تلفن همراه</label>
                          <input
                            type="text"
                            value={doc.header.mobileNumber}
                            onChange={(e) => handleHeaderChange("mobileNumber", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm transition focus:border-teal-500 focus:bg-slate-950 text-white text-left font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">تاریخ سند</label>
                          <input
                            type="text"
                            value={doc.header.date}
                            onChange={(e) => handleHeaderChange("date", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-center transition focus:border-teal-500 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">شماره ابلاغ</label>
                          <input
                            type="text"
                            value={doc.header.number}
                            onChange={(e) => handleHeaderChange("number", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-center transition focus:border-teal-500 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">پیوست</label>
                          <input
                            type="text"
                            value={doc.header.attachment}
                            onChange={(e) => handleHeaderChange("attachment", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-center transition focus:border-teal-500 text-white"
                          />
                        </div>
                      </div>

                      <hr className="border-slate-700 my-1" />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">مرجع قضایی (دادگاه)</label>
                          <input
                            type="text"
                            value={doc.header.courtName}
                            onChange={(e) => handleHeaderChange("courtName", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm transition focus:border-teal-500 text-white"
                            placeholder="دادگاه صلح شهرستان اصفهان"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">شعبه دادگاه</label>
                          <input
                            type="text"
                            value={doc.header.branch}
                            onChange={(e) => handleHeaderChange("branch", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm transition focus:border-teal-500 text-white"
                            placeholder="شعبه ۱۰۱ مکرر"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">کلاسه پرونده</label>
                          <input
                            type="text"
                            value={doc.header.caseNumber}
                            onChange={(e) => handleHeaderChange("caseNumber", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-center transition focus:border-teal-500 text-white font-mono"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">خواهان (طلبکار)</label>
                          <input
                            type="text"
                            value={doc.header.plaintiff}
                            onChange={(e) => handleHeaderChange("plaintiff", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-center transition focus:border-teal-500 text-white font-semibold"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-slate-400 mb-1.5">خوانده (بدهکار)</label>
                          <input
                            type="text"
                            value={doc.header.defendant}
                            onChange={(e) => handleHeaderChange("defendant", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-center transition focus:border-teal-500 text-white font-semibold"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: STATEMENTS OF THE PARTIES (Word-for-word) */}
                  {activeTab === "statements" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="bg-slate-900/60 p-3.5 border border-slate-700 rounded-xl flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-300 leading-relaxed">
                          <strong>ماده ۵-۱ و ۵-۲:</strong> مطابق الزامات دادگاه، اظهارات مکتوب خواهان و خوانده در جلسات حضوری کارشناسی باید به صورت کاملاً دقیق و <strong>کلمه به کلمه (عین کلمات دست‌نویس)</strong> ثبت گردد.
                        </span>
                      </div>

                      {/* Separate Uploader Cards for Plaintiff and Defendant Statements */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        
                        {/* 1. Plaintiff Statements Uploader */}
                        <div className="flex flex-col gap-3 bg-teal-950/20 border border-teal-800/40 rounded-xl p-4">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[11px] text-slate-300 font-medium">۱. بارگذاری مدارک/اظهارات خواهان ({doc.header.plaintiff || "خواهان"}):</span>
                            <label className="cursor-pointer flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition shadow-sm shrink-0">
                              <Upload className="w-3.5 h-3.5" />
                              <span>انتخاب اسناد خواهان</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf,.docx,.doc,.xlsx,.xls,.txt"
                                disabled={specificLoading !== null}
                                onChange={(e) => handleSpecificFileSelect("plaintiff_statements", e.target.files)}
                                className="hidden"
                                multiple
                              />
                            </label>
                          </div>

                          {/* Plaintiff Queue manager */}
                          {plaintiffStatementsFiles.length > 0 && (
                            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                              <div className="flex justify-between items-center px-0.5">
                                <span className="text-[10px] text-slate-400 font-semibold">اسناد خواهان در صف ({plaintiffStatementsFiles.length} مورد):</span>
                                <button
                                  type="button"
                                  onClick={() => setPlaintiffStatementsFiles([])}
                                  className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                                >
                                  حذف همه
                                </button>
                              </div>
                              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1 font-sans">
                                {plaintiffStatementsFiles.map((fObj) => (
                                  <div key={fObj.id} className="flex justify-between items-center bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-md text-xs">
                                    <span className="text-slate-200 truncate max-w-[150px] text-[11px]" title={fObj.file.name}>
                                      {fObj.file.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setPlaintiffStatementsFiles((prev) => prev.filter((item) => item.id !== fObj.id))}
                                      className="text-slate-400 hover:text-red-400 transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => runSpecificOCR("plaintiff_statements")}
                                disabled={specificLoading !== null}
                                className="w-full flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 py-2 rounded-lg text-xs font-bold transition shadow-sm mt-1"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                                {specificLoading === "plaintiff_statements" ? "در حال استخراج..." : `استخراج هوشمند کلمات خواهان`}
                              </button>
                            </div>
                          )}
                          {specificLoading === "plaintiff_statements" && (
                            <div className="flex items-center gap-2 text-xs text-teal-400 font-bold mt-1 animate-pulse">
                              <div className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>هوش مصنوعی در حال استخراج مکتوبات خواهان است...</span>
                            </div>
                          )}
                        </div>

                        {/* 2. Defendant Statements Uploader */}
                        <div className="flex flex-col gap-3 bg-amber-950/20 border border-amber-800/40 rounded-xl p-4">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[11px] text-slate-300 font-medium">۲. بارگذاری مدارک/اظهارات خوانده ({doc.header.defendant || "خوانده"}):</span>
                            <label className="cursor-pointer flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition shadow-sm shrink-0">
                              <Upload className="w-3.5 h-3.5" />
                              <span>انتخاب اسناد خوانده</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf,.docx,.doc,.xlsx,.xls,.txt"
                                disabled={specificLoading !== null}
                                onChange={(e) => handleSpecificFileSelect("defendant_statements", e.target.files)}
                                className="hidden"
                                multiple
                              />
                            </label>
                          </div>

                          {/* Defendant Queue manager */}
                          {defendantStatementsFiles.length > 0 && (
                            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                              <div className="flex justify-between items-center px-0.5">
                                <span className="text-[10px] text-slate-400 font-semibold">اسناد خوانده در صف ({defendantStatementsFiles.length} مورد):</span>
                                <button
                                  type="button"
                                  onClick={() => setDefendantStatementsFiles([])}
                                  className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                                >
                                  حذف همه
                                </button>
                              </div>
                              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1 font-sans">
                                {defendantStatementsFiles.map((fObj) => (
                                  <div key={fObj.id} className="flex justify-between items-center bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-md text-xs">
                                    <span className="text-slate-200 truncate max-w-[150px] text-[11px]" title={fObj.file.name}>
                                      {fObj.file.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setDefendantStatementsFiles((prev) => prev.filter((item) => item.id !== fObj.id))}
                                      className="text-slate-400 hover:text-red-400 transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => runSpecificOCR("defendant_statements")}
                                disabled={specificLoading !== null}
                                className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 py-2 rounded-lg text-xs font-bold transition shadow-sm mt-1"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                {specificLoading === "defendant_statements" ? "در حال استخراج..." : `استخراج هوشمند کلمات خوانده`}
                              </button>
                            </div>
                          )}
                          {specificLoading === "defendant_statements" && (
                            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mt-1 animate-pulse">
                              <div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>هوش مصنوعی در حال استخراج مکتوبات خوانده است...</span>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Plaintiff statements */}
                      <div className="border border-slate-700 rounded-xl p-4 bg-slate-900/20 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            ۵-۱- اظهارات دقیق خواهان ({doc.header.plaintiff})
                          </span>
                          <input
                            type="text"
                            value={doc.plaintiffStatementsDate}
                            onChange={(e) => handleSectionChange("plaintiffStatementsDate", e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] w-24 text-center text-slate-300 font-mono"
                            placeholder="تاریخ اظهارات"
                          />
                        </div>
                        <textarea
                          rows={4}
                          value={doc.plaintiffStatements}
                          onChange={(e) => handleSectionChange("plaintiffStatements", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs leading-relaxed transition focus:border-teal-500 text-white"
                          placeholder="متن دست‌نویس کلمه به کلمه خواهان..."
                        />
                      </div>

                      {/* Defendant statements */}
                      <div className="border border-slate-700 rounded-xl p-4 bg-slate-900/20 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            ۵-۲- اظهارات دقیق خوانده ({doc.header.defendant})
                          </span>
                          <input
                            type="text"
                            value={doc.defendantStatementsDate}
                            onChange={(e) => handleSectionChange("defendantStatementsDate", e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] w-24 text-center text-slate-300 font-mono"
                            placeholder="تاریخ اظهارات"
                          />
                        </div>
                        <textarea
                          rows={4}
                          value={doc.defendantStatements}
                          onChange={(e) => handleSectionChange("defendantStatements", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs leading-relaxed transition focus:border-teal-500 text-white"
                          placeholder="متن دست‌نویس کلمه به کلمه خوانده..."
                        />
                      </div>

                      {/* Lawyer statements */}
                      <div className="border border-slate-700 rounded-xl p-4 bg-slate-900/20 flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                          <label className="block text-xs font-bold text-slate-400">۵-۴- عنوان بخش وکلای طرفین</label>
                          <input
                            type="text"
                            value={doc.lawyerStatementsTitle}
                            onChange={(e) => handleSectionChange("lawyerStatementsTitle", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                            placeholder="مثال: اظهارات وکیل خواهان آقای محمدرضا کارفیدان"
                          />
                        </div>
                        <textarea
                          rows={3}
                          value={doc.lawyerStatements}
                          onChange={(e) => handleSectionChange("lawyerStatements", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs leading-relaxed transition focus:border-teal-500 text-white"
                          placeholder="متن اظهارات یا صورتجلسه غیبت و حضور وکلا..."
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: FINANCIALS & CONTRACTS */}
                  {activeTab === "financials" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex flex-col gap-5"
                    >
                      {/* Transactions List */}
                      <div>
                        <div className="flex justify-between items-center mb-2.5">
                          <div>
                            <span className="text-xs font-bold text-teal-400 flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ۵-۳- واریزی‌ها و مراودات مالی فی‌مابین ({doc.transactions.length})
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">درج منظم فیش‌های کارت به کارت و چک‌های بانکی</span>
                          </div>
                          <div className="flex gap-1.5">
                            <label className="cursor-pointer flex items-center gap-1 text-[11px] bg-teal-950/40 hover:bg-teal-950/70 text-teal-400 border border-teal-800/50 py-1.5 px-2.5 rounded-lg transition shrink-0">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>افزودن اسناد فیش/اکسل مالی</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf,.docx,.doc,.xlsx,.xls,.txt"
                                disabled={specificLoading !== null}
                                onChange={(e) => handleSpecificFileSelect("transactions", e.target.files)}
                                className="hidden"
                                multiple
                              />
                            </label>
                            <button
                              onClick={handleAddTransaction}
                              className="flex items-center gap-1.5 text-xs text-teal-300 hover:text-white bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-3 py-1.5 rounded-lg transition font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              افزودن تراکنش
                            </button>
                          </div>
                        </div>

                        {/* Transactions Queue */}
                        {transactionsFiles.length > 0 && (
                          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex flex-col gap-2 mb-3">
                            <div className="flex justify-between items-center px-0.5">
                              <span className="text-[10px] text-slate-400 font-semibold">اسناد مالی آماده استخراج ({transactionsFiles.length} مورد):</span>
                              <button
                                type="button"
                                onClick={() => setTransactionsFiles([])}
                                className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                              >
                                حذف همه
                              </button>
                            </div>
                            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                              {transactionsFiles.map((fObj) => (
                                <div key={fObj.id} className="flex justify-between items-center bg-slate-900 border border-slate-800 px-2 py-1 rounded-md text-xs">
                                  <span className="text-slate-200 truncate max-w-[240px] text-[11px]" title={fObj.file.name}>
                                    {fObj.file.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setTransactionsFiles((prev) => prev.filter((item) => item.id !== fObj.id))}
                                    className="text-slate-400 hover:text-red-400 transition"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => runSpecificOCR("transactions")}
                              disabled={specificLoading !== null}
                              className="w-full flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 py-1.5 rounded-lg text-xs font-bold transition shadow-sm mt-1"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                              {specificLoading === "transactions" ? "در حال استخراج تراکنش‌ها..." : `پردازش و استخراج گروهی (${transactionsFiles.length} سند مالی)`}
                            </button>
                          </div>
                        )}
                        {specificLoading === "transactions" && (
                          <div className="flex items-center gap-2 text-xs text-teal-400 font-bold mb-3 animate-pulse">
                            <div className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>هوش مصنوعی در حال شناسایی و استخراج جدول تراکنش‌های مالی است...</span>
                          </div>
                        )}

                        <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
                          {doc.transactions.map((tx, idx) => (
                            <div
                              key={tx.id}
                              className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col gap-2 relative hover:border-slate-600 transition"
                            >
                              <div className="flex justify-between items-center gap-2">
                                <span className="bg-slate-750 border border-slate-700 text-slate-300 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                
                                <select
                                  value={tx.paymentMethod}
                                  onChange={(e) => handleTransactionChange(tx.id, "paymentMethod", e.target.value)}
                                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-0.5 font-medium outline-none"
                                >
                                  <option value="کارت به کارت">کارت به کارت</option>
                                  <option value="چک">چک صیادی</option>
                                  <option value="حواله">حواله پایا/ساتنا</option>
                                  <option value="نقدی">واریز نقدی</option>
                                  <option value="سایر">سایر اسناد</option>
                                </select>

                                <input
                                  type="text"
                                  value={tx.date}
                                  onChange={(e) => handleTransactionChange(tx.id, "date", e.target.value)}
                                  className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] w-20 text-center text-slate-300"
                                  placeholder="۱۴۰۴/۰۲/۱۸"
                                />

                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="text-slate-400 hover:text-red-400 transition p-1 hover:bg-slate-800 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-8">
                                  <input
                                    type="text"
                                    value={tx.description}
                                    onChange={(e) => handleTransactionChange(tx.id, "description", e.target.value)}
                                    className="w-full bg-slate-850 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                                    placeholder="شرح و بابت تراکنش..."
                                  />
                                </div>
                                <div className="col-span-4">
                                  <input
                                    type="number"
                                    value={tx.amount}
                                    onChange={(e) => handleTransactionChange(tx.id, "amount", Number(e.target.value))}
                                    className="w-full bg-slate-850 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono text-left"
                                    placeholder="مبلغ به ریال"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <input
                                  type="text"
                                  value={tx.sourceAccount || ""}
                                  onChange={(e) => handleTransactionChange(tx.id, "sourceAccount", e.target.value)}
                                  className="w-full bg-slate-850/60 border border-slate-750 rounded px-2 py-1 text-[10px] text-slate-300"
                                  placeholder="حساب/کارت مبدأ (اختیاری)"
                                />
                                <input
                                  type="text"
                                  value={tx.destinationAccount || ""}
                                  onChange={(e) => handleTransactionChange(tx.id, "destinationAccount", e.target.value)}
                                  className="w-full bg-slate-850/60 border border-slate-750 rounded px-2 py-1 text-[10px] text-slate-300"
                                  placeholder="حساب/کارت مقصد (اختیاری)"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Calculated totals card */}
                        <div className="bg-slate-900 border border-slate-750 rounded-xl p-3 mt-3 flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-semibold">مجموع مراودات مالی:</span>
                          <span className="font-mono text-teal-400 font-bold text-sm">
                            {totalTransactionsAmount.toLocaleString("fa-IR")} ریال
                          </span>
                        </div>
                      </div>

                      {/* Contracts List */}
                      <div className="border-t border-slate-700/60 pt-4">
                        <div className="flex justify-between items-center mb-2.5">
                          <div>
                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              قراردادهای فی‌مابین طرفین ({doc.contracts.length})
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">درج منظم توافقات کتبی و الحاقیه‌ها</span>
                          </div>
                          <div className="flex gap-1.5">
                            <label className="cursor-pointer flex items-center gap-1 text-[11px] bg-amber-950/40 hover:bg-amber-950/70 text-amber-400 border border-amber-800/50 py-1.5 px-2.5 rounded-lg transition shrink-0">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>افزودن اسناد قرارداد/توافق‌نامه</span>
                              <input
                                type="file"
                                accept="image/*,application/pdf,.docx,.doc,.xlsx,.xls,.txt"
                                disabled={specificLoading !== null}
                                onChange={(e) => handleSpecificFileSelect("contracts", e.target.files)}
                                className="hidden"
                                multiple
                              />
                            </label>
                            <button
                              onClick={handleAddContract}
                              className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-lg transition font-medium"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              افزودن قرارداد
                            </button>
                          </div>
                        </div>

                        {/* Contracts Queue */}
                        {contractsFiles.length > 0 && (
                          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex flex-col gap-2 mb-3">
                            <div className="flex justify-between items-center px-0.5">
                              <span className="text-[10px] text-slate-400 font-semibold">اسناد قرارداد آماده استخراج ({contractsFiles.length} مورد):</span>
                              <button
                                type="button"
                                onClick={() => setContractsFiles([])}
                                className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                              >
                                حذف همه
                              </button>
                            </div>
                            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                              {contractsFiles.map((fObj) => (
                                <div key={fObj.id} className="flex justify-between items-center bg-slate-900 border border-slate-800 px-2 py-1 rounded-md text-xs">
                                  <span className="text-slate-200 truncate max-w-[240px] text-[11px]" title={fObj.file.name}>
                                    {fObj.file.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setContractsFiles((prev) => prev.filter((item) => item.id !== fObj.id))}
                                    className="text-slate-400 hover:text-red-400 transition"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => runSpecificOCR("contracts")}
                              disabled={specificLoading !== null}
                              className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 py-1.5 rounded-lg text-xs font-bold transition shadow-sm mt-1"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              {specificLoading === "contracts" ? "در حال استخراج قراردادها..." : `پردازش و استخراج گروهی (${contractsFiles.length} سند قرارداد)`}
                            </button>
                          </div>
                        )}
                        {specificLoading === "contracts" && (
                          <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-3 animate-pulse">
                            <div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>هوش مصنوعی در حال شناسایی و استخراج اطلاعات مفاد قراردادها است...</span>
                          </div>
                        )}

                        <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                          {doc.contracts.map((c, index) => (
                            <div
                              key={c.id}
                              className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col gap-2 relative hover:border-slate-600 transition"
                            >
                              <div className="flex justify-between items-center gap-2">
                                <span className="bg-slate-750 border border-slate-700 text-slate-300 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                  {index + 1}
                                </span>
                                
                                <input
                                  type="text"
                                  value={c.date}
                                  onChange={(e) => handleContractChange(c.id, "date", e.target.value)}
                                  className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] w-24 text-center text-slate-300"
                                  placeholder="تاریخ قرارداد"
                                />

                                <button
                                  onClick={() => handleDeleteContract(c.id)}
                                  className="text-slate-400 hover:text-red-400 transition p-1 hover:bg-slate-800 rounded animate-none"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-8">
                                  <input
                                    type="text"
                                    value={c.subject}
                                    onChange={(e) => handleContractChange(c.id, "subject", e.target.value)}
                                    className="w-full bg-slate-850 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                                    placeholder="موضوع قرارداد..."
                                  />
                                </div>
                                <div className="col-span-4">
                                  <input
                                    type="number"
                                    value={c.amount}
                                    onChange={(e) => handleContractChange(c.id, "amount", Number(e.target.value))}
                                    className="w-full bg-slate-850 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono text-left"
                                    placeholder="مبلغ اسمی به ریال"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: STANDARD REPORT SECTIONS */}
                  {activeTab === "sections" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1"
                    >
                      {/* Section 1 */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-300">۱- موضوع پرونده</label>
                        <textarea
                          rows={2.5}
                          value={doc.caseSubject}
                          onChange={(e) => handleSectionChange("caseSubject", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs leading-relaxed transition focus:border-teal-500 text-white resize-none"
                        />
                      </div>

                      {/* Section 2 */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-300">۲- قرار کارشناسی صادرشده</label>
                        <textarea
                          rows={2.5}
                          value={doc.expertDecree}
                          onChange={(e) => handleSectionChange("expertDecree", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs leading-relaxed transition focus:border-teal-500 text-white resize-none"
                        />
                      </div>

                      {/* Section 3 */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-300">۳- نحوه بررسی اسناد و مدارک</label>
                        <textarea
                          rows={2.5}
                          value={doc.investigationMethod}
                          onChange={(e) => handleSectionChange("investigationMethod", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs leading-relaxed transition focus:border-teal-500 text-white resize-none"
                        />
                      </div>

                      {/* Section 4 */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-300">۴- محدودیت‌های رسیدگی</label>
                        <textarea
                          rows={2.5}
                          value={doc.limitations}
                          onChange={(e) => handleSectionChange("limitations", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs leading-relaxed transition focus:border-teal-500 text-white resize-none"
                        />
                      </div>

                      {/* Section 6 (Expert Opinion) - Strict Constraints */}
                      <div className="flex flex-col gap-1.5 border-t border-slate-700/60 pt-3 mt-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-teal-400">۶- نظریه نهایی کارشناس رسمی</label>
                          <span className="text-[9px] bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded-full">
                            فقط تخصصی حسابداری
                          </span>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 text-[10px] text-amber-300 leading-relaxed mb-1">
                          ⚠️ <strong>توجه کارشناسی:</strong> مطابق دستورالعمل، نظر کارشناسی باید کاملاً متمرکز بر مباحث حسابداری مالی، ردیابی وجوه، و تراز حساب‌های طرفین باشد. از ورود به موضوعات حقوقی، کیفری، نیت‌خوانی و سایر حیطه‌ها خودداری نمایید.
                        </div>
                        <textarea
                          rows={6}
                          value={doc.expertOpinion}
                          onChange={(e) => handleSectionChange("expertOpinion", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs leading-relaxed transition focus:border-teal-500 text-white"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: SMART OCR/AI TRANSCRIPTION */}
                  {activeTab === "ocr" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="text-xs text-slate-300 leading-relaxed">
                        تصویر صورتجلسه دست‌نویس حضوری، تصاویر فیش‌های واریزی کارت به کارت، صفحات دفتر حسابداری یا برگه الحاقیه را در زیر آپلود کنید. موتور هوش مصنوعی <strong>Gemini 3.5</strong> با دقت بالا ارقام مالی و متن‌های حقوقی را شناسایی و جایگزین می‌کند.
                      </div>

                      {/* Drag & Drop uploader */}
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={triggerFileSelect}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition duration-200 flex flex-col items-center justify-center gap-3 ${
                          dragActive
                            ? "border-teal-500 bg-teal-500/5"
                            : "border-slate-700 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/80"
                        }`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*,application/pdf,.docx,.doc,.xlsx,.xls,.txt"
                          className="hidden"
                          multiple
                        />

                        <div className="flex flex-col items-center gap-3 py-2">
                          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-full">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-200">بارگذاری نامحدود اسناد، تصاویر، فایل‌های PDF یا اکسل/ورد</p>
                            <p className="text-xs text-slate-500 mt-1">امکان انتخاب همزمان چندین سند رسمی، فیش بانکی یا فایل پرونده</p>
                          </div>
                        </div>
                      </div>

                      {/* File Queue List */}
                      {generalFiles.length > 0 && (
                        <div className="w-full flex flex-col gap-2 mt-2">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-bold text-slate-300">لیست فایل‌های آماده پردازش ({generalFiles.length} فایل):</span>
                            <button
                              type="button"
                              onClick={() => setGeneralFiles([])}
                              className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              پاکسازی همه
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                            {generalFiles.map((fileObj) => (
                              <div
                                key={fileObj.id}
                                className="bg-slate-900 border border-slate-750 p-2.5 rounded-xl flex items-center justify-between gap-2.5 hover:border-slate-650 transition"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  {fileObj.preview ? (
                                    <img
                                      src={fileObj.preview}
                                      alt={fileObj.file.name}
                                      className="w-10 h-10 rounded object-cover shadow-sm shrink-0 border border-slate-700"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                      {fileObj.file.name.endsWith(".pdf") ? (
                                        <FileText className="w-5 h-5 text-red-400" />
                                      ) : fileObj.file.name.endsWith(".xlsx") || fileObj.file.name.endsWith(".xls") ? (
                                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                                      ) : fileObj.file.name.endsWith(".docx") || fileObj.file.name.endsWith(".doc") ? (
                                        <FileText className="w-5 h-5 text-blue-400" />
                                      ) : (
                                        <FileText className="w-5 h-5 text-teal-400" />
                                      )}
                                    </div>
                                  )}
                                  <div className="flex flex-col text-right overflow-hidden">
                                    <span className="text-xs text-slate-200 font-bold truncate max-w-[140px]">{fileObj.file.name}</span>
                                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">{(fileObj.file.size / 1024).toFixed(1)} KB</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setGeneralFiles((prev) => prev.filter((f) => f.id !== fileObj.id))}
                                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0"
                                  title="حذف فایل"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {generalFiles.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2">
                          <button
                            onClick={handleTranscribe}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 py-3 rounded-xl text-xs md:text-sm font-bold transition duration-150 shadow-md shadow-teal-950/20"
                          >
                            <Sparkles className="w-4 h-4 animate-pulse text-teal-300" />
                            شروع استخراج و پردازش گروهی ({generalFiles.length} سند) با هوش مصنوعی (Gemini)
                          </button>
                        </div>
                      )}

                      {/* Beautiful AI loading stepper */}
                      {loading && (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-teal-400">هوش مصنوعی کارشناسی در حال پردازش سند...</span>
                          </div>
                          
                          <div className="text-[11px] text-slate-300 font-medium leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 animate-pulse">
                            {loadingSteps[loadingStep]}
                          </div>

                          {/* Stepper indicators */}
                          <div className="flex justify-between items-center mt-1">
                            {loadingSteps.map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-1 flex-1 mx-0.5 rounded-full transition-all duration-300 ${
                                  idx <= loadingStep ? "bg-teal-500" : "bg-slate-800"
                                }`}
                              ></div>
                            ))}
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="bg-red-950/40 border border-red-900/60 text-red-300 p-4 rounded-xl text-xs leading-relaxed flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </div>
                      )}
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>

            {/* Document stats */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <FileCheck className="w-4.5 h-4.5 text-teal-400" />
                <span>وضعیت گزارش کارشناسی:</span>
                <span className="text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-normal">
                  آماده ارائه به دادگاه صلح
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-3">
                <span>تراکنش‌ها: <strong className="text-white">{doc.transactions.length}</strong></span>
                <span>قراردادها: <strong className="text-white">{doc.contracts.length}</strong></span>
              </div>
            </div>



            {/* Saved Reports Manager */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-slate-900 border-b border-slate-700/60 px-5 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-teal-400" />
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">گزارش‌های ذخیره‌شده (آرشیو محلی)</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">مدیریت پیش‌نویس‌ها در حافظه مرورگر</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSaveDialog(!showSaveDialog)}
                  className="flex items-center gap-1.5 text-xs text-teal-300 hover:text-white bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-3 py-1.5 rounded-lg transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  ذخیره گزارش فعلی
                </button>
              </div>

              {showSaveDialog && (
                <div className="p-4 bg-slate-900/50 border-b border-slate-700/50 flex flex-col gap-3">
                  <label className="text-xs font-semibold text-slate-300">عنوان پیش‌نویس:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      placeholder={`پیش‌نویس کلاسه ${doc.header.caseNumber || "خام"} - خواهان: ${doc.header.plaintiff || "نامشخص"}`}
                      className="flex-1 bg-slate-950 border border-slate-750 rounded-xl px-3.5 py-2 text-xs text-white"
                    />
                    <button
                      onClick={() => saveReport()}
                      className="bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-xl text-xs font-bold text-white transition"
                    >
                      تایید ذخیره
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 flex flex-col gap-2.5 max-h-[220px] overflow-y-auto">
                {savedReports.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                    <Database className="w-8 h-8 opacity-25" />
                    <span>هیچ گزارش ذخیره‌شده‌ای یافت نشد.</span>
                  </div>
                ) : (
                  savedReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-slate-900/40 border border-slate-700/60 hover:border-slate-600 transition rounded-xl p-3 flex justify-between items-center gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-200 truncate">{report.title}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{report.dateSaved}</p>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => loadReport(report.data)}
                          className="bg-slate-800 hover:bg-slate-700 text-teal-400 px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
                        >
                          بارگذاری
                        </button>
                        <button
                          onClick={() => deleteReport(report.id, report.title)}
                          className="bg-slate-800 hover:bg-slate-700 text-red-400 px-2 py-1.5 rounded-lg border border-slate-700 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Import/Export Backup */}
              <div className="p-3 bg-slate-900/40 border-t border-slate-700/60 flex justify-between items-center gap-2 text-xs">
                <span className="text-[10px] text-slate-400 font-medium">پشتیبان‌گیری کامل از آرشیو گزارشات:</span>
                <div className="flex gap-2">
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-1 px-2.5 rounded-lg transition text-[11px]">
                    وارد کردن JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={importBackupJSON}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={exportBackupJSON}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-1 px-2.5 rounded-lg transition text-[11px]"
                  >
                    خروجی JSON
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* A4 PREVIEW COLUMN - LEFT SIDE (Printable layout mimicking physical paper perfectly) */}
          <div className={`lg:col-span-7 flex justify-center print-container ${mobileView === "preview" ? "block" : "hidden lg:block"}`}>
            
            <div
              id="document-print-area"
              className="print-page w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 border border-slate-300 lg:shadow-xl rounded-2xl lg:rounded-sm p-6 md:p-12 relative flex flex-col justify-between transition-all duration-300 select-text"
            >
              {/* Double line traditional border frame shown in Farsi raw court template */}
              <div className="absolute inset-4 border border-double border-slate-400 rounded pointer-events-none p-1">
                <div className="w-full h-full border border-slate-300 rounded"></div>
              </div>

              {/* Inside Content Area */}
              <div className="relative z-10 flex flex-col flex-1 p-2 md:p-4">
                
                {/* Header Info */}
                <div className="grid grid-cols-12 items-start gap-2 mb-3 pb-2 text-[10px] md:text-xs">
                  {/* Left: date, number, attachment */}
                  <div className="col-span-4 flex flex-col gap-1 text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span>تاریخ:</span>
                      <span className="font-mono">{doc.header.date || "................"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>شماره:</span>
                      <span className="font-mono">{doc.header.number || "................"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>پیوست:</span>
                      <span>{doc.header.attachment || "................"}</span>
                    </div>
                  </div>

                  {/* Center: logo and court affiliation */}
                  <div className="col-span-4 flex flex-col items-center text-center">
                    <span className="font-bold text-slate-800 tracking-wider text-xs mb-1">بسمه تعالی</span>
                    <div className="w-10 h-10 border border-slate-400 rounded-full flex items-center justify-center text-[7px] font-semibold text-slate-600 bg-slate-50 mb-1 leading-none shadow-sm select-none p-1">
                      کانون کارشناسان
                    </div>
                    <h3 className="font-bold text-slate-800 leading-tight">
                      کانون کارشناسان رسمی دادگستری
                    </h3>
                    <h4 className="text-[9px] font-bold text-slate-500 mt-0.5">استان اصفهان</h4>
                  </div>

                  {/* Right: expert metadata */}
                  <div className="col-span-4 flex flex-col items-start text-right leading-tight text-slate-700">
                    <h2 className="font-bold text-slate-900 text-xs md:text-sm mb-0.5">
                      {doc.header.expertName}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-semibold mb-1">{doc.header.field}</p>
                    <p className="text-[9px] text-slate-500">پروانه: <span className="font-mono">{doc.header.licenseNumber}</span></p>
                    <p className="text-[9px] text-slate-500 mt-0.5">موبایل: <span className="font-mono">{doc.header.mobileNumber}</span></p>
                  </div>
                </div>

                {/* Separation Rule Line */}
                <div className="h-[2px] bg-slate-800 w-full mb-5"></div>

                {/* Recipient Addressed Block */}
                <div className="text-right mb-4 text-xs md:text-sm text-slate-900 font-bold leading-relaxed">
                  <p>ریاست محترم {doc.header.branch || ".........."} {doc.header.courtName || "..................."}</p>
                  <p className="mt-1">با سلام</p>
                </div>

                {/* Reference standard sentence */}
                <p className="text-right text-[11px] md:text-xs text-slate-800 leading-relaxed mb-4 indent-6">
                  احتراما عطف به ابلاغ امر کارشناسی پرونده کلاسه <strong className="font-mono">{doc.header.caseNumber || "........"}</strong> موضوع دعوی آقای <strong>{doc.header.plaintiff || "........"}</strong> به طرفیت آقای <strong>{doc.header.defendant || "........"}</strong>، رسیدگیهای خود را بشرح ذیل انجام و نتیجه حاصله از رسیدگیهای مذکور را بشرح آتی به استحضار می رساند:
                </p>

                {/* Section 1: Subject */}
                <div className="mb-4">
                  <h3 className="font-bold text-xs md:text-sm text-slate-950 mb-1">۱- موضوع پرونده:</h3>
                  <p className="text-[11px] md:text-xs text-slate-800 leading-relaxed pr-4 text-justify">
                    {doc.caseSubject || "درخواست تعیین مانده حساب و تراز مالی معاملات تلفن همراه."}
                  </p>
                </div>

                {/* Section 2: Decree */}
                <div className="mb-4">
                  <h3 className="font-bold text-xs md:text-sm text-slate-950 mb-1">۲- قرار کارشناسی:</h3>
                  <p className="text-[11px] md:text-xs text-slate-800 leading-relaxed pr-4 text-justify">
                    {doc.expertDecree}
                  </p>
                </div>

                {/* Section 3: Investigation method */}
                <div className="mb-4">
                  <h3 className="font-bold text-xs md:text-sm text-slate-950 mb-1">۳- نحوه بررسی اسناد و مدارک:</h3>
                  <p className="text-[11px] md:text-xs text-slate-800 leading-relaxed pr-4 text-justify">
                    {doc.investigationMethod}
                  </p>
                </div>

                {/* Section 4: Limitations */}
                <div className="mb-4">
                  <h3 className="font-bold text-xs md:text-sm text-slate-950 mb-1">۴- محدودیت‌های رسیدگی:</h3>
                  <p className="text-[11px] md:text-xs text-slate-800 leading-relaxed pr-4 text-justify">
                    {doc.limitations}
                  </p>
                </div>

                {/* Section 5: Experimental Analysis */}
                <div className="mb-4">
                  <h3 className="font-bold text-xs md:text-sm text-slate-950 mb-2">۵- شرح بررسی‌های کارشناسی براساس مفاد قرار کارشناسی:</h3>
                  
                  {/* 5-1: Plaintiff statements */}
                  <div className="mb-3 pr-2">
                    <h4 className="font-bold text-[11px] md:text-xs text-slate-900">۵-۱- اظهارات خواهان:</h4>
                    <p className="text-[10px] md:text-[11px] text-slate-500 italic mt-0.5">
                      اظهارات خواهان در تاریخ {doc.plaintiffStatementsDate || "................"} به شرح ذیل می باشد:
                    </p>
                    <p className="text-[11px] md:text-xs text-slate-800 leading-relaxed mt-1 pr-3 bg-slate-50/50 p-2 rounded border border-slate-100 whitespace-pre-wrap text-justify">
                      {doc.plaintiffStatements || "موردی ثبت نشده است."}
                    </p>
                  </div>

                  {/* 5-2: Defendant statements */}
                  <div className="mb-4 pr-2">
                    <h4 className="font-bold text-[11px] md:text-xs text-slate-900">۵-۲- اظهارات خوانده:</h4>
                    <p className="text-[10px] md:text-[11px] text-slate-500 italic mt-0.5">
                      اظهارات خوانده در تاریخ {doc.defendantStatementsDate || "................"} به شرح ذیل می باشد:
                    </p>
                    <p className="text-[11px] md:text-xs text-slate-800 leading-relaxed mt-1 pr-3 bg-slate-50/50 p-2 rounded border border-slate-100 whitespace-pre-wrap text-justify">
                      {doc.defendantStatements || "موردی ثبت نشده است."}
                    </p>
                  </div>

                  {/* 5-3: Financial Transactions Table */}
                  <div className="mb-4 pr-2 page-break">
                    <h4 className="font-bold text-[11px] md:text-xs text-slate-950 mb-2">
                      ۵-۳- مستندات خوانده در خصوص واریزیهای انجام شده از حساب خواهان / مراودات مالی طرفین:
                    </h4>
                    
                    {(() => {
                      const hasSourceAccountCol = doc.transactions.some(tx => tx.sourceAccount && tx.sourceAccount.trim() !== "");
                      const hasDestinationAccountCol = doc.transactions.some(tx => tx.destinationAccount && tx.destinationAccount.trim() !== "");
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px] md:text-xs text-right border-collapse border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="border border-slate-300 px-2 py-1.5 text-center w-10">ردیف</th>
                                <th className="border border-slate-300 px-3 py-1.5">شرح و بابت تراکنش</th>
                                {hasSourceAccountCol && <th className="border border-slate-300 px-2 py-1.5 text-center w-28">حساب/کارت مبدأ</th>}
                                {hasDestinationAccountCol && <th className="border border-slate-300 px-2 py-1.5 text-center w-28">حساب/کارت مقصد</th>}
                                <th className="border border-slate-300 px-2 py-1.5 text-center w-24">نحوه پرداخت / سند</th>
                                <th className="border border-slate-300 px-2 py-1.5 text-center w-20">تاریخ</th>
                                <th className="border border-slate-300 px-3 py-1.5 text-left w-32">جمع مبلغ (ریال)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {doc.transactions.map((tx, idx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/40">
                                  <td className="border border-slate-300 px-2 py-1 text-center font-mono">{(idx + 1).toLocaleString("fa-IR")}</td>
                                  <td className="border border-slate-300 px-3 py-1 font-medium">{tx.description}</td>
                                  {hasSourceAccountCol && <td className="border border-slate-300 px-2 py-1 text-center bg-slate-50/30 font-mono text-[10px]">{tx.sourceAccount || "—"}</td>}
                                  {hasDestinationAccountCol && <td className="border border-slate-300 px-2 py-1 text-center bg-slate-50/30 font-mono text-[10px]">{tx.destinationAccount || "—"}</td>}
                                  <td className="border border-slate-300 px-2 py-1 text-center bg-slate-50/30">{tx.paymentMethod}</td>
                                  <td className="border border-slate-300 px-2 py-1 text-center font-mono">{tx.date}</td>
                                  <td className="border border-slate-300 px-3 py-1 text-left font-mono font-semibold">{tx.amount.toLocaleString("fa-IR")}</td>
                                </tr>
                              ))}
                              {doc.transactions.length === 0 && (
                                <tr>
                                  <td colSpan={5 + (hasSourceAccountCol ? 1 : 0) + (hasDestinationAccountCol ? 1 : 0)} className="border border-slate-300 px-3 py-4 text-center text-slate-400 italic">
                                    هیچ تراکنش مالی برای این گزارش ثبت نگردیده است.
                                  </td>
                                </tr>
                              )}
                              {/* Totals row */}
                              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                                <td colSpan={4 + (hasSourceAccountCol ? 1 : 0) + (hasDestinationAccountCol ? 1 : 0)} className="border border-slate-300 px-3 py-2 text-left">
                                  جمع کل تراکنش‌های مالی و واریزهای احرازشده:
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-left font-mono">
                                  {totalTransactionsAmount.toLocaleString("fa-IR")} ریال
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                    {totalTransactionsAmount > 0 && (
                      <p className="text-[9px] md:text-[10px] text-slate-500 font-bold mt-1.5 text-left">
                        مبلغ به حروف: {convertNumToPersianWords(totalTransactionsAmount)}
                      </p>
                    )}
                  </div>

                  {/* Contracts Table (if any) */}
                  {doc.contracts.length > 0 && (
                    <div className="mb-4 pr-2">
                      <h4 className="font-bold text-[11px] md:text-xs text-slate-950 mb-2">
                        توافقات مکتوب و قراردادهای استخراج‌شده فی‌مابین:
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] md:text-xs text-right border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-150 border-b border-slate-300">
                              <th className="border border-slate-300 px-2 py-1 text-center w-10">ردیف</th>
                              <th className="border border-slate-300 px-3 py-1">موضوع قرارداد فی‌مابین طرفین</th>
                              <th className="border border-slate-300 px-2 py-1 text-center w-24">تاریخ قرارداد</th>
                              <th className="border border-slate-300 px-3 py-1 text-left w-32">مبلغ اسمی (ریال)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doc.contracts.map((c, index) => (
                              <tr key={c.id}>
                                <td className="border border-slate-300 px-2 py-1 text-center font-mono">{(index + 1).toLocaleString("fa-IR")}</td>
                                <td className="border border-slate-300 px-3 py-1 font-medium">{c.subject}</td>
                                <td className="border border-slate-300 px-2 py-1 text-center font-mono">{c.date}</td>
                                <td className="border border-slate-300 px-3 py-1 text-left font-mono">{c.amount.toLocaleString("fa-IR")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Claimed Goods Table (if any, e.g. Clothing case) */}
                  {doc.claimedGoods && doc.claimedGoods.length > 0 && (
                    <div className="mb-4 pr-2">
                      <h4 className="font-bold text-[11px] md:text-xs text-slate-950 mb-2">
                        ۵-۳-ب- لیست اجناس و البسه ادعایی خواهان جهت بررسی تحویل کالا:
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] md:text-xs text-right border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300">
                              <th className="border border-slate-300 px-2 py-1 text-center w-10">ردیف</th>
                              <th className="border border-slate-300 px-3 py-1">شرح کالا / موضوع تحویل</th>
                              <th className="border border-slate-300 px-2 py-1 text-center w-24">تعداد / مقدار</th>
                              <th className="border border-slate-300 px-3 py-1 text-left w-32">ارزش برآوردی ادعایی (ریال)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doc.claimedGoods.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50/40">
                                <td className="border border-slate-300 px-2 py-1 text-center font-mono">{(idx + 1).toLocaleString("fa-IR")}</td>
                                <td className="border border-slate-300 px-3 py-1 font-medium">{item.subject}</td>
                                <td className="border border-slate-300 px-2 py-1 text-center font-sans bg-slate-50/30">{item.count}</td>
                                <td className="border border-slate-300 px-3 py-1 text-left font-mono">{(item.amount).toLocaleString("fa-IR")}</td>
                              </tr>
                            ))}
                            {/* Totals for goods */}
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                              <td colSpan={3} className="border border-slate-300 px-3 py-1.5 text-left">
                                جمع ارزش ادعایی تحویل کالا:
                              </td>
                              <td className="border border-slate-300 px-3 py-1.5 text-left font-mono">
                                {(doc.claimedGoods.reduce((sum, item) => sum + item.amount, 0)).toLocaleString("fa-IR")} ریال
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Cheque Rows Table (if any, e.g. Well water case historic checks) */}
                  {doc.chequeRows && doc.chequeRows.length > 0 && (
                    <div className="mb-4 pr-2">
                      <h4 className="font-bold text-[11px] md:text-xs text-slate-950 mb-2">
                        جدول شماره ۱: خلاصه وضعیت چک‌های صادر شده از حساب خوانده:
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] md:text-xs text-right border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300">
                              <th className="border border-slate-300 px-2 py-1 text-center w-10">ردیف</th>
                              <th className="border border-slate-300 px-3 py-1">شماره چک صیادی / عادی</th>
                              <th className="border border-slate-300 px-2 py-1 text-center w-24">سررسید چک</th>
                              <th className="border border-slate-300 px-3 py-1 text-left w-32">مبلغ چک (ریال)</th>
                              <th className="border border-slate-300 px-3 py-1 text-center">آخرین وضعیت وصول</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doc.chequeRows.map((ch, idx) => (
                              <tr key={ch.id} className="hover:bg-slate-50/40">
                                <td className="border border-slate-300 px-2 py-1 text-center font-mono">{(idx + 1).toLocaleString("fa-IR")}</td>
                                <td className="border border-slate-300 px-3 py-1 font-mono">{ch.chequeNumber}</td>
                                <td className="border border-slate-300 px-2 py-1 text-center font-mono">{ch.dueDate}</td>
                                <td className="border border-slate-300 px-3 py-1 text-left font-mono">{ch.amount.toLocaleString("fa-IR")}</td>
                                <td className="border border-slate-300 px-3 py-1 text-center font-medium text-emerald-700">{ch.status}</td>
                              </tr>
                            ))}
                            {/* Totals for cheques */}
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                              <td colSpan={3} className="border border-slate-300 px-3 py-1.5 text-left">
                                جمع کل چک‌های ارزیابی شده:
                              </td>
                              <td colSpan={2} className="border border-slate-300 px-3 py-1.5 text-left font-mono">
                                {(doc.chequeRows.reduce((sum, ch) => sum + ch.amount, 0)).toLocaleString("fa-IR")} ریال
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Reconciliation Rows Table (if any, e.g. Clothing case comparisons) */}
                  {doc.reconciliationRows && doc.reconciliationRows.length > 0 && (
                    <div className="mb-4 pr-2 page-break">
                      <h4 className="font-bold text-[11px] md:text-xs text-slate-950 mb-2">
                        ۵-۴- جدول تطبیقی موازنه ادعاها و مستندات ابرازی طرفین (تراز مالی کارشناسی):
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] md:text-xs text-right border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-900">
                              <th className="border border-slate-300 px-2 py-1.5 text-center w-10">ردیف</th>
                              <th className="border border-slate-300 px-3 py-1.5 w-1/5">موضوع مغایرت</th>
                              <th className="border border-slate-300 px-3 py-1.5 w-1/4">ادعا و اظهارات خواهان</th>
                              <th className="border border-slate-300 px-3 py-1.5 w-1/4">دفاعیات و مدارک خوانده</th>
                              <th className="border border-slate-300 px-3 py-1.5 text-slate-950 font-bold bg-teal-50/30">نتیجه و ارزیابی کارشناس</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doc.reconciliationRows.map((row, idx) => (
                              <tr key={row.id} className="hover:bg-slate-50/40">
                                <td className="border border-slate-300 px-2 py-2 text-center font-mono">{(idx + 1).toLocaleString("fa-IR")}</td>
                                <td className="border border-slate-300 px-3 py-2 font-bold text-slate-900">{row.subject}</td>
                                <td className="border border-slate-300 px-3 py-2 text-slate-800">{row.plaintiffClaim}</td>
                                <td className="border border-slate-300 px-3 py-2 text-slate-800">{row.defendantDefense}</td>
                                <td className="border border-slate-300 px-3 py-2 text-slate-950 bg-teal-50/10 font-medium leading-relaxed">{row.assessment}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Scenarios (if any, e.g. Well water dual options) */}
                  {doc.scenarios && doc.scenarios.length > 0 && (
                    <div className="mb-4 pr-2 page-break">
                      <h4 className="font-bold text-[11px] md:text-xs text-rose-800 mb-2 flex items-center gap-1">
                        <span>⚠️ فرضیات و سناریوهای موازنه مالی بنا به تفاسیر حقوقی دادگاه محترم:</span>
                      </h4>
                      <div className="flex flex-col gap-3">
                        {doc.scenarios.map((sc, idx) => (
                          <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <h5 className="font-bold text-[11px] md:text-xs text-slate-900 border-b border-slate-200 pb-1.5 mb-1.5">
                              {sc.title}
                            </h5>
                            <p className="text-[10px] md:text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap text-justify font-sans">
                              {sc.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5-4: Lawyer statements */}
                  <div className="mb-4 pr-2">
                    <h4 className="font-bold text-[11px] md:text-xs text-slate-900">
                      ۵-۴- {doc.lawyerStatementsTitle || "اظهارات وکیل خواهان / خوانده"}:
                    </h4>
                    <p className="text-[11px] md:text-xs text-slate-800 leading-relaxed mt-1 pr-3 bg-slate-50/50 p-2 rounded border border-slate-100 whitespace-pre-wrap text-justify">
                      {doc.lawyerStatements}
                    </p>
                  </div>
                </div>

                {/* Section 6: final expert opinion */}
                <div className="mb-6">
                  <h3 className="font-bold text-xs md:text-sm text-slate-950 mb-1 border-b border-slate-100 pb-0.5">۶- اظهار نظر کارشناسی:</h3>
                  <p className="text-[11px] md:text-xs text-slate-800 leading-relaxed pr-4 whitespace-pre-wrap text-justify font-medium">
                    {doc.expertOpinion}
                  </p>
                  <p className="text-[10px] md:text-xs font-bold text-slate-900 mt-3 pr-4 leading-relaxed">
                    اظهار نظر اینجانب صرفا اظهار نظر کارشناسی بوده و اتخاذ تصمیم لازم در صلاحیت آن مقام محترم قضائی می باشد.
                  </p>
                </div>

                {/* Signature Closing block */}
                <div className="flex flex-col items-end text-left pl-6 mt-4 self-end">
                  <p className="text-xs font-semibold text-slate-700">با تقدیم احترام مجدد</p>
                  <p className="text-xs font-bold text-slate-950 mt-1">{doc.header.expertName}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">کارشناس رسمی دادگستری رشته حسابداری و حسابرسی</p>
                  
                  {/* Simulated Official Expert stamp and signature graphic */}
                  <div className="relative mt-2 mr-6 select-none opacity-90">
                    {/* Circle stamp overlay representation */}
                    <div className="w-16 h-16 rounded-full border-2 border-teal-600/40 flex items-center justify-center rotate-12 text-[7px] text-teal-600/60 font-bold p-1 text-center leading-none">
                      کارشناس رسمی سعید کبیریان پروانه ۱۲۰۹۳۷۰۱۲۷
                    </div>
                    {/* Abstract sign path representing the expert's actual signature shown in the screenshots */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 select-none pointer-events-none text-slate-400">
                      <svg width="60" height="30" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-teal-600/50 stroke-2">
                        <path d="M10 25 C30 10, 70 40, 90 20 M20 40 C40 10, 50 30, 80 45" />
                      </svg>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom margins signatures footer matching Page 3 */}
              <div className="relative z-10 grid grid-cols-3 border-t border-slate-300 pt-3 text-[9px] md:text-[10px] text-slate-600 font-bold mt-8 text-center no-print">
                <div className="flex flex-col gap-1">
                  <span>امضا خواهان / نماینده قانونی</span>
                  <span className="text-slate-300">...........................</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span>امضا خوانده / وکیل پرونده</span>
                  <span className="text-slate-300">...........................</span>
                </div>
                <div className="flex flex-col gap-1 font-semibold text-slate-700">
                  <span>امضا و مهر کارشناس رسمی</span>
                  <span className="text-slate-400">{doc.header.expertName}</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* Floating Smart AI Assistant Widget */}
      <div className="fixed bottom-6 left-6 z-40 no-print" dir="rtl">
        <AnimatePresence>
          {isAssistantOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30, x: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30, x: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="absolute bottom-16 left-0 w-[350px] sm:w-[420px] max-h-[520px] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 text-right"
            >
              {/* Header */}
              <div className="bg-gradient-to-l from-slate-900 to-slate-950 border-b border-slate-800/80 px-4.5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
                  <Sparkles className="w-4.5 h-4.5 text-teal-400" />
                  <span className="font-bold text-slate-100 text-xs sm:text-sm font-sans">دستیار صوتی و متنی کارشناسی</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssistantOpen(false)}
                  className="text-slate-400 hover:text-slate-200 transition p-1 hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat History */}
              <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[250px] bg-slate-950/40 min-h-[160px]">
                {assistantMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[90%] rounded-2xl p-3 text-[11px] leading-relaxed ${
                      msg.role === "assistant"
                        ? "bg-slate-800 text-slate-200 self-start border border-slate-750/70"
                        : "bg-teal-600 text-white self-end"
                    }`}
                  >
                    <span className="font-bold text-[9px] opacity-70 mb-1 font-sans">
                      {msg.role === "assistant" ? "🤖 دستیار کارشناسی" : "👤 شما"}
                    </span>
                    <span className="whitespace-pre-line font-medium leading-relaxed">{msg.text}</span>
                  </div>
                ))}
                {assistantLoading && (
                  <div className="bg-slate-800 text-slate-300 border border-slate-750/70 self-start max-w-[90%] rounded-2xl p-3 text-[11px] flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>در حال ویرایش گزارش و اعمال تغییرات...</span>
                  </div>
                )}
              </div>

              {/* Quick Suggestions */}
              <div className="px-4 py-2.5 flex flex-wrap gap-1.5 border-t border-slate-800 bg-slate-950/20 max-h-[100px] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setAssistantQuery("یک تراکنش جدید به مبلغ ۱۲۰ میلیون ریال بابت کارت به کارت چک برگشتی اضافه کن")}
                  className="text-[9px] bg-slate-800 hover:bg-slate-750 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-750 transition font-sans font-medium"
                >
                  + تراکنش جدید
                </button>
                <button
                  type="button"
                  onClick={() => setAssistantQuery("مبلغ آخرین قرارداد را ۵۰ درصد افزایش بده")}
                  className="text-[9px] bg-slate-800 hover:bg-slate-750 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-750 transition font-sans font-medium"
                >
                  📈 افزایش مبلغ قرارداد
                </button>
                <button
                  type="button"
                  onClick={() => setAssistantQuery("نظریه نهایی کارشناسی را رسمی‌تر کن")}
                  className="text-[9px] bg-slate-800 hover:bg-slate-750 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-750 transition font-sans font-medium"
                >
                  ✍️ بازنویسی نظریه نهایی
                </button>
              </div>

              {/* Input Form with Audio & Text Controls */}
              <form onSubmit={handleAssistantSubmit} className="p-3 border-t border-slate-800 bg-slate-950/60 flex gap-2">
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={startListening}
                  className={`p-2.5 rounded-xl border transition shrink-0 flex items-center justify-center ${
                    isListening
                      ? "bg-rose-600 border-rose-500 text-white animate-pulse"
                      : "bg-slate-800 border-slate-700 hover:border-slate-600 text-teal-400 hover:text-teal-300"
                  }`}
                  title={isListening ? "در حال شنیدن صدای شما..." : "تایپ صوتی دستور (فارسی)"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={assistantQuery}
                  onChange={(e) => setAssistantQuery(e.target.value)}
                  placeholder={isListening ? "در حال شنیدن... صحبت کنید" : "دستور متنی یا صوتی شما..."}
                  disabled={assistantLoading}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                />

                <button
                  type="submit"
                  disabled={assistantLoading || !assistantQuery.trim()}
                  className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 p-2.5 rounded-xl text-white transition shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Trigger Button */}
        <motion.button
          type="button"
          onClick={() => setIsAssistantOpen(!isAssistantOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl border transition duration-300 relative ${
            isAssistantOpen
              ? "bg-slate-900 border-slate-700 text-teal-400"
              : "bg-teal-600 border-teal-500 hover:bg-teal-500 text-white"
          }`}
        >
          <div className="absolute -inset-1 rounded-full bg-teal-500/20 blur opacity-40 animate-pulse"></div>
          {isAssistantOpen ? (
            <X className="w-4.5 h-4.5" />
          ) : (
            <Sparkles className="w-4.5 h-4.5 text-white animate-bounce" />
          )}
          <span className="text-xs font-bold font-sans">دستیار هوشمند</span>
          {isListening && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </motion.button>
      </div>

      {/* Reusable Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full no-print"
          >
            <div className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 ${
              toast.type === "success" 
                ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/30 shadow-emerald-950/20"
                : toast.type === "error"
                ? "bg-rose-950/90 text-rose-300 border-rose-500/30 shadow-rose-950/20"
                : "bg-teal-950/90 text-teal-300 border-teal-500/30 shadow-teal-950/20"
            }`}>
              <div className="shrink-0">
                {toast.type === "success" ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : toast.type === "error" ? (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                ) : (
                  <Info className="w-5 h-5 text-teal-400" />
                )}
              </div>
              <div className="flex-1 font-sans text-xs font-semibold leading-relaxed">
                {toast.message}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom High-Fidelity Confirmation Modal */}
      <AnimatePresence>
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-right"
              dir="rtl"
            >
              <div className="bg-slate-900 border-b border-slate-700/60 p-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <h3 className="font-bold text-slate-100 text-sm md:text-base font-sans leading-none mt-1">
                  {confirmModal.title}
                </h3>
              </div>
              <div className="p-5">
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-sans font-medium text-justify">
                  {confirmModal.message}
                </p>
              </div>
              <div className="bg-slate-900/50 px-5 py-4 border-t border-slate-700/40 flex justify-end gap-2.5">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-700"
                >
                  انصراف
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-4.5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  تایید و ادامه
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
