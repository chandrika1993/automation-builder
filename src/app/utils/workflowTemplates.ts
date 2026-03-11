// utils/workflowTemplates.ts

import { NodeData } from "../components/nodeEditModal/NodeEditModal";

// Helper to build templates with auto-generated UUIDs
function n(type: string, x: number, y: number, data: NodeData) {
  return { id: crypto.randomUUID(), type, position: { x, y }, data };
}

function e(source: string, target: string) {
  return { id: crypto.randomUUID(), source, target, animated: true };
}

type TemplateNode = {
  id:       string;
  type:     string;
  position: { x: number; y: number };
  data:     NodeData;
};

type TemplateEdge = {
  id:        string;
  source:    string;
  target:    string;
  animated?: boolean;
};

export type WorkflowTemplate = {
  id:          string;
  name:        string;
  description: string;
  icon:        string;
  color:       string;
  category:    string;
  tags:        string[];
  nodes:       TemplateNode[];
  edges:       TemplateEdge[];
};

//   Template factory                              
// Each template is built inside a function so IDs are generated fresh
// at module load time and are valid UUIDs from the start.

function makeClaimsProcessing(): WorkflowTemplate {
  const n1 = n("custom",    100,  200, { label: "Claim Submitted",       variant: "input"  });
  const n2 = n("webhook",   350,  200, { label: "Validate Documents",    webhookUrl: ""    });
  const n3 = n("condition", 600,  200, { label: "Documents Complete?",   condition: 'claim.documentsComplete === true' });
  const n4 = n("email",     850,  100, { label: "Request Missing Docs",  emailTo: ""       });
  const n5 = n("webhook",   850,  300, { label: "Auto-Assess Claim",     webhookUrl: ""    });
  const n6 = n("condition", 1100, 300, { label: "Claim Approved?",       condition: 'claim.approved === true' });
  const n7 = n("webhook",   1350, 200, { label: "Trigger Payout",        webhookUrl: ""    });
  const n8 = n("email",     1350, 400, { label: "Send Rejection Notice", emailTo: ""       });
  const n9 = n("custom",    1600, 300, { label: "Done",                  variant: "output" });

  return {
    id:          "insurance-claims-processing",
    name:        "Autonomous Claims Processing",
    description: "Validate incoming claim documents, auto-assess completeness, and route to payout or rejection.",
    icon:        "ShieldCheck",
    color:       "#f87171",
    category:    "Insurance",
    tags:        ["claims", "condition", "webhook"],
    nodes: [n1, n2, n3, n4, n5, n6, n7, n8, n9],
    edges: [
      e(n1.id, n2.id), e(n2.id, n3.id),
      e(n3.id, n4.id), e(n3.id, n5.id),
      e(n5.id, n6.id),
      e(n6.id, n7.id), e(n6.id, n8.id),
      e(n7.id, n9.id), e(n8.id, n9.id),
    ],
  };
}

function makePolicyRenewal(): WorkflowTemplate {
  const n1 = n("custom",    100,  200, { label: "Renewal Due",        variant: "input"  });
  const n2 = n("email",     350,  200, { label: "Renewal Reminder",   emailTo: ""       });
  const n3 = n("delay",     600,  200, { label: "Wait 7 Days",        delaySeconds: 604800 });
  const n4 = n("condition", 850,  200, { label: "Renewed?",           condition: 'policy.renewed === true' });
  const n5 = n("email",     1100, 100, { label: "Confirmation Email", emailTo: ""       });
  const n6 = n("email",     1100, 300, { label: "Escalate to Agent",  emailTo: ""       });
  const n7 = n("custom",    1350, 200, { label: "Done",               variant: "output" });

  return {
    id:          "insurance-policy-renewal",
    name:        "Policy Renewal Reminder",
    description: "Notify customers before policy expiry, chase non-renewals, and confirm or escalate to an agent.",
    icon:        "RefreshCw",
    color:       "#fb923c",
    category:    "Insurance",
    tags:        ["email", "delay", "condition"],
    nodes: [n1, n2, n3, n4, n5, n6, n7],
    edges: [
      e(n1.id, n2.id), e(n2.id, n3.id), e(n3.id, n4.id),
      e(n4.id, n5.id), e(n4.id, n6.id),
      e(n5.id, n7.id), e(n6.id, n7.id),
    ],
  };
}

function makeLoanApplication(): WorkflowTemplate {
  const n1 = n("custom",    100,  200, { label: "Loan Application Received", variant: "input"  });
  const n2 = n("webhook",   350,  200, { label: "KYC Check",                 webhookUrl: ""    });
  const n3 = n("condition", 600,  200, { label: "KYC Passed?",               condition: 'kyc.passed === true' });
  const n4 = n("email",     850,  100, { label: "KYC Rejection Email",       emailTo: ""       });
  const n5 = n("webhook",   850,  300, { label: "Credit Assessment",         webhookUrl: ""    });
  const n6 = n("condition", 1100, 300, { label: "Credit Approved?",          condition: 'credit.approved === true' });
  const n7 = n("email",     1350, 200, { label: "Loan Offer Email",          emailTo: ""       });
  const n8 = n("email",     1350, 400, { label: "Decline Notification",      emailTo: ""       });
  const n9 = n("custom",    1600, 300, { label: "Done",                      variant: "output" });

  return {
    id:          "banking-loan-application",
    name:        "Loan Application Processing",
    description: "Run KYC and credit checks on a loan application, then issue an offer or decline notification.",
    icon:        "Landmark",
    color:       "#818cf8",
    category:    "Banking",
    tags:        ["webhook", "condition", "email", "kyc"],
    nodes: [n1, n2, n3, n4, n5, n6, n7, n8, n9],
    edges: [
      e(n1.id, n2.id), e(n2.id, n3.id),
      e(n3.id, n4.id), e(n3.id, n5.id),
      e(n5.id, n6.id),
      e(n6.id, n7.id), e(n6.id, n8.id),
      e(n7.id, n9.id), e(n8.id, n9.id),
    ],
  };
}

function makeAccountsPayable(): WorkflowTemplate {
  const n1 = n("custom",    100,  200, { label: "Invoice Received",       variant: "input"  });
  const n2 = n("webhook",   350,  200, { label: "Extract Invoice Data",   webhookUrl: ""    });
  const n3 = n("condition", 600,  200, { label: "PO Match?",              condition: 'invoice.poMatch === true' });
  const n4 = n("email",     850,  100, { label: "Flag Exception",         emailTo: ""       });
  const n5 = n("webhook",   850,  300, { label: "Auto-Approve Payment",   webhookUrl: ""    });
  const n6 = n("email",     1100, 300, { label: "Remittance to Supplier", emailTo: ""       });
  const n7 = n("custom",    1350, 200, { label: "Done",                   variant: "output" });

  return {
    id:          "gbs-accounts-payable",
    name:        "Accounts Payable Automation",
    description: "Ingest invoices, match against POs, auto-approve matched invoices, and flag exceptions.",
    icon:        "Receipt",
    color:       "#34d399",
    category:    "GBS",
    tags:        ["webhook", "condition", "email", "finance"],
    nodes: [n1, n2, n3, n4, n5, n6, n7],
    edges: [
      e(n1.id, n2.id), e(n2.id, n3.id),
      e(n3.id, n4.id), e(n3.id, n5.id),
      e(n5.id, n6.id),
      e(n4.id, n7.id), e(n6.id, n7.id),
    ],
  };
}

function makeOrderToCash(): WorkflowTemplate {
  const n1 = n("custom",    100,  200, { label: "Order Received",        variant: "input"  });
  const n2 = n("webhook",   350,  200, { label: "Trigger Fulfilment",    webhookUrl: ""    });
  const n3 = n("email",     600,  200, { label: "Shipping Notification", emailTo: ""       });
  const n4 = n("delay",     850,  200, { label: "Wait for Delivery",     delaySeconds: 259200 });
  const n5 = n("condition", 1100, 200, { label: "Delivered?",            condition: 'shipment.delivered === true' });
  const n6 = n("email",     1350, 100, { label: "Send Invoice",          emailTo: ""       });
  const n7 = n("email",     1350, 300, { label: "Delivery Escalation",   emailTo: ""       });
  const n8 = n("custom",    1600, 200, { label: "Done",                  variant: "output" });

  return {
    id:          "gbs-order-to-cash",
    name:        "Order to Cash",
    description: "Process a customer order through fulfilment, shipping, delivery confirmation, and invoicing.",
    icon:        "CircleDollarSign",
    color:       "#38bdf8", 
    category:    "GBS",
    tags:        ["webhook", "email", "delay", "finance"],
    nodes: [n1, n2, n3, n4, n5, n6, n7, n8],
    edges: [
      e(n1.id, n2.id), e(n2.id, n3.id), e(n3.id, n4.id), e(n4.id, n5.id),
      e(n5.id, n6.id), e(n5.id, n7.id),
      e(n6.id, n8.id), e(n7.id, n8.id),
    ],
  };
}

//   Export                                   
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  makeClaimsProcessing(),
  makePolicyRenewal(),
  makeLoanApplication(),
  makeAccountsPayable(),
  makeOrderToCash(),
];

//   Instantiate with fresh UUIDs (so same template can be loaded multiple times)
export function instantiateTemplate(template: WorkflowTemplate) {
  const idMap = new Map<string, string>();

  const nodes = template.nodes.map((node) => {
    const newId = crypto.randomUUID();
    idMap.set(node.id, newId);
    return { ...node, id: newId };
  });

  const edges = template.edges.map((edge) => ({
    ...edge,
    id:     crypto.randomUUID(),
    source: idMap.get(edge.source) ?? edge.source,
    target: idMap.get(edge.target) ?? edge.target,
  }));
  return { nodes, edges };
}