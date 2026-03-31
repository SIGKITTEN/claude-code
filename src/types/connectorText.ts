// Stub: connector text types for external builds

export interface ConnectorTextBlock {
  type: 'connector_text'
  text: string
  connector_id?: string
}

export function isConnectorTextBlock(block: unknown): block is ConnectorTextBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    'type' in block &&
    (block as { type: string }).type === 'connector_text'
  )
}
