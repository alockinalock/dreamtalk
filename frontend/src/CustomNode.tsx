import { Handle, Position } from '@xyflow/react'

type Props = {
  data: { label: string }
}

export default function CustomNode({ data }: Props) {
  return (
    <div
      style={{
        padding: '8px 16px',
        border: '1px solid #777',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
        maxWidth: 240,
        minHeight: 40,
        background: '#fff',
        position: 'relative',
        boxSizing: 'border-box',
        color: '#000',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#555', left: -8 }} />
      <div
        style={{
          pointerEvents: 'none',
          textAlign: 'center',
          flex: 1,
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          lineHeight: '1.2',
        }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#555', right: -8 }} />
    </div>
  )
}