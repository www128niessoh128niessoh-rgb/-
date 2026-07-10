import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  Packer,
  HeadingLevel,
} from "docx";
import { saveAs } from "file-saver";
import { ExpertReport } from "../types";

// Format currency helper for Farsi
const formatCurrency = (num: number) => {
  return num.toLocaleString("fa-IR") + " ریال";
};

export const generateDocx = (docData: ExpertReport) => {
  const {
    header,
    caseSubject,
    expertDecree,
    investigationMethod,
    limitations,
    plaintiffStatements,
    plaintiffStatementsDate,
    defendantStatements,
    defendantStatementsDate,
    lawyerStatementsTitle,
    lawyerStatements,
    contracts,
    transactions,
    expertOpinion,
  } = docData;

  // Header Table (Right-aligned expert info, center logo metadata, left-aligned dates)
  const headerTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [
      new TableRow({
        children: [
          // Left: date metadata
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.LEFT,
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: `تاریخ: ${header.date || "..................."}`, font: "B Nazanin", size: 22 }),
                ],
              }),
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.LEFT,
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: `شماره: ${header.number || "..................."}`, font: "B Nazanin", size: 22 }),
                ],
              }),
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({ text: `پیوست: ${header.attachment || "..................."}`, font: "B Nazanin", size: 22 }),
                ],
              }),
            ],
          }),

          // Center: logo/title
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 },
                children: [
                  new TextRun({ text: "بسمه تعالی", font: "B Nazanin", bold: true, size: 24 }),
                ],
              }),
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: "کانون کارشناسان رسمی دادگستری", font: "B Nazanin", bold: true, size: 24 }),
                ],
              }),
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "استان اصفهان", font: "B Nazanin", bold: true, size: 22 }),
                ],
              }),
            ],
          }),

          // Right: expert details
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: header.expertName, font: "B Nazanin", bold: true, size: 26 }),
                ],
              }),
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: header.field, font: "B Nazanin", size: 22 }),
                ],
              }),
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },
                children: [
                  new TextRun({ text: `پروانه: ${header.licenseNumber}`, font: "B Nazanin", size: 20 }),
                ],
              }),
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `تلفن همراه: ${header.mobileNumber}`, font: "B Nazanin", size: 20 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Solid black horizontal separator
  const divider = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 16, color: "000000" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [new TableRow({ children: [new TableCell({ children: [] })] })],
  });

  // Main list of Word document content blocks
  const documentChildren = [
    headerTable,
    new Paragraph({ spacing: { before: 100, after: 100 } }),
    divider,
    new Paragraph({ spacing: { before: 200, after: 200 } }),

    // Recipient & Court Addressed Line
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `ریاست محترم ${header.branch || "..........."} ${header.courtName || "..................."}`,
          font: "B Nazanin",
          bold: true,
          size: 26,
        }),
      ],
    }),

    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "با سلام",
          font: "B Nazanin",
          bold: true,
          size: 24,
        }),
      ],
    }),

    // Opening formal sentence
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { line: 360, after: 300 },
      indent: { right: 200, left: 200 },
      children: [
        new TextRun({
          text: `احتراما عطف به ابلاغ امر کارشناسی پرونده کلاسه ${header.caseNumber || "..........."} موضوع دعوی آقای ${header.plaintiff || "..........."} به طرفیت آقای ${header.defendant || "..........."}، رسیدگیهای خود را بشرح ذیل انجام و نتیجه حاصله از رسیدگیهای مذکور را بشرح آتی به استحضار می رساند:`,
          font: "B Nazanin",
          size: 24,
        }),
      ],
    }),

    // 1- موضوع پرونده
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: "۱- موضوع پرونده:", font: "B Nazanin", bold: true, size: 26 }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { line: 320, after: 240 },
      indent: { right: 400 },
      children: [
        new TextRun({ text: caseSubject, font: "B Nazanin", size: 24 }),
      ],
    }),

    // 2- قرار کارشناسی
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: "۲- قرار کارشناسی:", font: "B Nazanin", bold: true, size: 26 }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { line: 320, after: 240 },
      indent: { right: 400 },
      children: [
        new TextRun({ text: expertDecree, font: "B Nazanin", size: 24 }),
      ],
    }),

    // 3- نحوه بررسی اسناد و مدارک
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: "۳- نحوه بررسی اسناد و مدارک:", font: "B Nazanin", bold: true, size: 26 }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { line: 320, after: 240 },
      indent: { right: 400 },
      children: [
        new TextRun({ text: investigationMethod, font: "B Nazanin", size: 24 }),
      ],
    }),

    // 4- محدودیت‌های رسیدگی
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: "۴- محدودیتهای رسیدگی:", font: "B Nazanin", bold: true, size: 26 }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { line: 320, after: 300 },
      indent: { right: 400 },
      children: [
        new TextRun({ text: limitations, font: "B Nazanin", size: 24 }),
      ],
    }),

    // 5- شرح بررسی‌های کارشناسی براساس مفاد قرار کارشناسی
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({ text: "۵- شرح بررسیهای کارشناسی براساس مفاد قرار کارشناسی:", font: "B Nazanin", bold: true, size: 28 }),
      ],
    }),

    // 5-1- اظهارات خواهان
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 150, after: 80 },
      indent: { right: 200 },
      children: [
        new TextRun({ text: "۵-۱- اظهارات خواهان:", font: "B Nazanin", bold: true, size: 25 }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 100 },
      indent: { right: 300 },
      children: [
        new TextRun({
          text: `اظهارات خواهان در تاریخ ${plaintiffStatementsDate || "................"} به شرح ذیل می باشد:`,
          font: "B Nazanin",
          italics: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { line: 320, after: 200 },
      indent: { right: 400, left: 200 },
      children: [
        new TextRun({ text: plaintiffStatements, font: "B Nazanin", size: 24 }),
      ],
    }),

    // 5-2- اظهارات خوانده
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 150, after: 80 },
      indent: { right: 200 },
      children: [
        new TextRun({ text: "۵-۲- اظهارات خوانده:", font: "B Nazanin", bold: true, size: 25 }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 100 },
      indent: { right: 300 },
      children: [
        new TextRun({
          text: `اظهارات خوانده در تاریخ ${defendantStatementsDate || "................"} به شرح ذیل می باشد:`,
          font: "B Nazanin",
          italics: true,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { line: 320, after: 200 },
      indent: { right: 400, left: 200 },
      children: [
        new TextRun({ text: defendantStatements, font: "B Nazanin", size: 24 }),
      ],
    }),
  ];

  // 5-3- مستندات خوانده / تراکنش‌های مالی طرفین (with beautiful table)
  documentChildren.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 120 },
      indent: { right: 200 },
      children: [
        new TextRun({ text: "۵-۳- مستندات خوانده در خصوص واریزیهای انجام شده و مراودات مالی طرفین:", font: "B Nazanin", bold: true, size: 25 }),
      ],
    })
  );

  // Generate Transactions Table
  const trRows = [];
  
  // Table Header row
  trRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: "F2F2F2" },
          children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ردیف", font: "B Nazanin", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          shading: { fill: "F2F2F2" },
          children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "شرح و بابت تراکنش مالی طرفین", font: "B Nazanin", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: "F2F2F2" },
          children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "نحوه پرداخت / سند مادی", font: "B Nazanin", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: "F2F2F2" },
          children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "جمع مبلغ (ریال)", font: "B Nazanin", bold: true, size: 20 })] })],
        }),
      ],
    })
  );

  let totalAmount = 0;
  transactions.forEach((tx, idx) => {
    totalAmount += tx.amount;
    trRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: (idx + 1).toLocaleString("fa-IR"), font: "B Nazanin", size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, indent: { right: 100 }, children: [new TextRun({ text: tx.description, font: "B Nazanin", size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: tx.paymentMethod, font: "B Nazanin", size: 20 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.LEFT, indent: { left: 100 }, children: [new TextRun({ text: tx.amount.toLocaleString("fa-IR"), font: "B Nazanin", size: 20 })] })],
          }),
        ],
      })
    );
  });

  // Table Total row
  trRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 3,
          shading: { fill: "F9F9F9" },
          children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.LEFT, indent: { left: 200 }, children: [new TextRun({ text: "جمع کل تراکنش‌های استخراج‌شده:", font: "B Nazanin", bold: true, size: 20 })] })],
        }),
        new TableCell({
          shading: { fill: "F9F9F9" },
          children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.LEFT, indent: { left: 100 }, children: [new TextRun({ text: totalAmount.toLocaleString("fa-IR") + " ریال", font: "B Nazanin", bold: true, size: 20 })] })],
        }),
      ],
    })
  );

  const transactionsTable = new Table({
    width: { size: 90, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    rows: trRows,
  });

  documentChildren.push(transactionsTable);
  documentChildren.push(new Paragraph({ spacing: { before: 150, after: 150 } }));

  // If there are contracts, add the Contracts table
  if (contracts && contracts.length > 0) {
    documentChildren.push(
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 150, after: 100 },
        indent: { right: 200 },
        children: [
          new TextRun({ text: "قراردادهای فی‌مابین طرفین اختلاف:", font: "B Nazanin", bold: true, size: 22 }),
        ],
      })
    );

    const contractRows = [];
    contractRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ردیف", font: "B Nazanin", bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "موضوع قرارداد فی‌مابین", font: "B Nazanin", bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "تاریخ قرارداد", font: "B Nazanin", bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: "F2F2F2" },
            children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "مبلغ اسمی (ریال)", font: "B Nazanin", bold: true, size: 20 })] })],
          }),
        ],
      })
    );

    contracts.forEach((contract, index) => {
      contractRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: (index + 1).toLocaleString("fa-IR"), font: "B Nazanin", size: 20 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, indent: { right: 100 }, children: [new TextRun({ text: contract.subject, font: "B Nazanin", size: 20 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: contract.date, font: "B Nazanin", size: 20 })] })],
            }),
            new TableCell({
              children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.LEFT, indent: { left: 100 }, children: [new TextRun({ text: contract.amount.toLocaleString("fa-IR"), font: "B Nazanin", size: 20 })] })],
            }),
          ],
        })
      );
    });

    const contractsTable = new Table({
      width: { size: 90, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: contractRows,
    });

    documentChildren.push(contractsTable);
    documentChildren.push(new Paragraph({ spacing: { before: 150, after: 150 } }));
  }

  // 5-4- اظهارات وکیل
  documentChildren.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 150, after: 80 },
      indent: { right: 200 },
      children: [
        new TextRun({ text: `۵-۴- ${lawyerStatementsTitle || "اظهارات وکیل خواهان / خوانده"}:`, font: "B Nazanin", bold: true, size: 25 }),
      ],
    })
  );
  documentChildren.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { line: 320, after: 240 },
      indent: { right: 400, left: 200 },
      children: [
        new TextRun({ text: lawyerStatements, font: "B Nazanin", size: 24 }),
      ],
    })
  );

  // 6- اظهار نظر کارشناسی (Accounting and Auditing strict constraints)
  documentChildren.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: "۶- اظهار نظر کارشناسی:", font: "B Nazanin", bold: true, size: 26 }),
      ],
    })
  );
  documentChildren.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { line: 320, after: 200 },
      indent: { right: 400, left: 200 },
      children: [
        new TextRun({ text: expertOpinion, font: "B Nazanin", size: 24 }),
      ],
    })
  );

  // Statutory expert notice
  documentChildren.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 180, after: 300 },
      indent: { right: 200, left: 200 },
      children: [
        new TextRun({
          text: "اظهار نظر اینجانب صرفا اظهار نظر کارشناسی بوده و اتخاذ تصمیم لازم در صلاحیت آن مقام محترم قضائی می باشد.",
          font: "B Nazanin",
          bold: true,
          size: 24,
        }),
      ],
    })
  );

  // Final respect and signing block
  documentChildren.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.LEFT,
      spacing: { before: 300, after: 60 },
      indent: { left: 400 },
      children: [
        new TextRun({ text: "با تقدیم احترام مجدد", font: "B Nazanin", bold: true, size: 24 }),
      ],
    })
  );
  documentChildren.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
      indent: { left: 400 },
      children: [
        new TextRun({ text: "سعید کبیریان", font: "B Nazanin", bold: true, size: 24 }),
      ],
    })
  );
  documentChildren.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.LEFT,
      spacing: { after: 300 },
      indent: { left: 400 },
      children: [
        new TextRun({ text: "کارشناس رسمی دادگستری رشته حسابداری و حسابرسی", font: "B Nazanin", size: 22 }),
      ],
    })
  );

  // Bottom footer signatures box (Table layout mirrored across pages)
  const footerSignatures = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                spacing: { before: 150, after: 500 },
                children: [new TextRun({ text: "امضاء خواهان / نماینده", font: "B Nazanin", bold: true, size: 20 })],
              }),
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "...........................", font: "B Nazanin", size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                spacing: { before: 150, after: 500 },
                children: [new TextRun({ text: "امضاء خوانده / وکیل", font: "B Nazanin", bold: true, size: 20 })],
              }),
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "...........................", font: "B Nazanin", size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                spacing: { before: 150, after: 500 },
                children: [new TextRun({ text: "امضاء کارشناس رسمی", font: "B Nazanin", bold: true, size: 20 })],
              }),
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `کارشناس ${header.expertName}`, font: "B Nazanin", size: 18 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  documentChildren.push(footerSignatures);

  // Instantiate the Doc with standard margins and bidi section
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: documentChildren,
      },
    ],
  });

  Packer.toBlob(doc).then((blob) => {
    saveAs(blob, `گزارش_کارشناسی_حسابداری_${header.plaintiff || "خواهان"}_بابت_کلاسه_${header.caseNumber.replace(/\//g, "-")}.docx`);
  });
};
