// components/nodes/nodeTypes.tsx
import { memo } from "react";
import { Node, NodeProps } from "@xyflow/react";
import BaseNodeComponent from "./baseNode/BaseNode";
import CustomNode from "./customNode/CustomNode";
import { Link, Mail, Split, Timer } from "lucide-react";
import { NodeData } from "../nodeEditModal/NodeEditModal";

/**
 * Concrete node components — each wraps BaseNodeComponent with a fixed
 * accent colour, icon, type label, and the relevant meta field extracted
 * from `data`. All are memoised to prevent re-renders from unrelated
 * canvas state changes.
 *
 * Meta field conventions:
 *  - Email     → "to"   : recipient address
 *  - Webhook   → "url"  : hostname truncated to 24 chars (strips protocol)
 *  - Delay     → "wait" : seconds formatted as "Xs"
 *  - Condition → "if"   : raw condition expression
 */

const EmailNode = memo(({ data, selected }: NodeProps<Node<NodeData>>) => (
  <BaseNodeComponent
    selected={selected}
    accent="#059669"
    typeLabel="Email"
    icon={<Mail size={14} />}
    label={data.label}
    description={data.description}
    meta={data.emailTo ? { key: "to", val: data.emailTo } : undefined}
  />
));

const WebhookNode = memo(({ data, selected }: NodeProps<Node<NodeData>>) => (
  <BaseNodeComponent
    selected={selected}
    accent="#0284c7"
    typeLabel="Webhook"
    icon={<Link size={14} />}
    label={data.label}
    description={data.description}
    meta={
      data.webhookUrl
        ? {
            key: "url",
            val: data.webhookUrl.replace(/^https?:\/\//, "").slice(0, 24),
          }
        : undefined
    }
  />
));

const DelayNode = memo(({ data, selected }: NodeProps<Node<NodeData>>) => (
  <BaseNodeComponent
    selected={selected}
    accent="#d97706"
    typeLabel="Delay"
    icon={<Timer size={14} />}
    label={data.label}
    description={data.description}
    meta={
      data.delaySeconds !== undefined
        ? { key: "wait", val: `${data.delaySeconds}s` }
        : undefined
    }
  />
));

const ConditionNode = memo(({ data, selected }: NodeProps<Node<NodeData>>) => (
  <BaseNodeComponent
    selected={selected}
    accent="#db2777"
    typeLabel="Condition"
    icon={<Split size={14} />}
    label={data.label}
    description={data.description}
    meta={data.condition ? { key: "if", val: data.condition } : undefined}
  />
));

EmailNode.displayName = "EmailNode";
WebhookNode.displayName = "WebhookNode";
DelayNode.displayName = "DelayNode";
ConditionNode.displayName = "ConditionNode";

export const nodeTypes = {
  email: EmailNode,
  webhook: WebhookNode,
  delay: DelayNode,
  condition: ConditionNode,
  custom: CustomNode,
};
