import type React from 'react'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import { formatTimestamp } from '@/lib/api-client'
import { StatusBadge } from '@/components/app-shell'

type Column<T> = {
  key: string
  title: string
  render: (row: T) => React.ReactNode
}

export function ResourceTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  emptyTitle,
  emptyDescription,
  rowHref,
  actionLabel
}: {
  columns: Array<Column<T>>
  rows: T[]
  loading: boolean
  emptyTitle: string
  emptyDescription: string
  rowHref?: (row: T) => string
  actionLabel?: string
}) {
  if (loading) {
    return <div className="table-state">Loading resources…</div>
  }

  if (!rows.length) {
    return (
      <div className="table-state">
        <strong>{emptyTitle}</strong>
        <p>{emptyDescription}</p>
      </div>
    )
  }

  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.title}</th>
          ))}
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((column, index) => {
              const content = column.render(row)
              if (index === 0 && rowHref) {
                return (
                  <td key={column.key}>
                    <Link className="row-link" href={rowHref(row)}>
                      {content}
                    </Link>
                  </td>
                )
              }
              return <td key={column.key}>{content}</td>
            })}
            <td>
              <button className="icon-btn" aria-label={actionLabel || 'Row actions'}>
                <MoreHorizontal size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function dateCell(value: string) {
  return <span className="timestamp">{formatTimestamp(value)}</span>
}

export function statusCell(status: 'provisioning' | 'ready' | 'paused' | 'error') {
  const mapped = status === 'ready' ? 'healthy' : status === 'provisioning' ? 'warning' : 'paused'
  return <StatusBadge value={mapped} />
}
