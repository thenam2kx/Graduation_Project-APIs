import React, { useState, useEffect } from 'react'
import { 
  Table, 
  Button, 
  Modal, 
  message, 
  Popconfirm, 
  Select, 
  Card, 
  Space, 
  Checkbox,
  Pagination,
  Tag,
  Typography
} from 'antd'
import { 
  DeleteOutlined, 
  UndoOutlined, 
  ReloadOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Option } = Select
const { Title } = Typography

interface DeletedItem {
  _id: string
  name?: string
  title?: string
  email?: string
  deletedAt: string
  [key: string]: any
}

interface SoftDeleteManagerProps {
  apiBaseUrl?: string
}

const SUPPORTED_MODELS = [
  { key: 'products', label: 'Sản phẩm', icon: '📦' },
  { key: 'users', label: 'Người dùng', icon: '👥' },
  { key: 'categories', label: 'Danh mục', icon: '🏷️' },
  { key: 'brands', label: 'Thương hiệu', icon: '🏢' },
  { key: 'blogs', label: 'Blog', icon: '📝' },
  { key: 'contacts', label: 'Liên hệ', icon: '📧' },
  { key: 'reviews', label: 'Đánh giá', icon: '⭐' },
  { key: 'wishlists', label: 'Yêu thích', icon: '❤️' }
]

const SoftDeleteManager: React.FC<SoftDeleteManagerProps> = ({ 
  apiBaseUrl = '/api/v1' 
}) => {
  const [currentModel, setCurrentModel] = useState('products')
  const [items, setItems] = useState<DeletedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  const fetchDeletedItems = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${apiBaseUrl}/soft-delete/${currentModel}?page=${pagination.current}&limit=${pagination.pageSize}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch deleted items')
      }

      const result = await response.json()
      setItems(result.data.results)
      setPagination(prev => ({
        ...prev,
        total: result.data.meta.total
      }))
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (id: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${apiBaseUrl}/soft-delete/${currentModel}/${id}/restore`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to restore item')
      }

      message.success('Khôi phục thành công!')
      fetchDeletedItems()
    } catch (error) {
      message.error('Lỗi khi khôi phục: ' + (error as Error).message)
    }
  }

  const handlePermanentDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${apiBaseUrl}/soft-delete/${currentModel}/${id}/permanent`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete item permanently')
      }

      message.success('Xóa vĩnh viễn thành công!')
      fetchDeletedItems()
    } catch (error) {
      message.error('Lỗi khi xóa vĩnh viễn: ' + (error as Error).message)
    }
  }

  const handleBulkRestore = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất một item')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${apiBaseUrl}/soft-delete/${currentModel}/bulk/restore`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: selectedRowKeys })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to bulk restore items')
      }

      message.success(`Khôi phục thành công ${selectedRowKeys.length} items!`)
      setSelectedRowKeys([])
      fetchDeletedItems()
    } catch (error) {
      message.error('Lỗi khi khôi phục hàng loạt: ' + (error as Error).message)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất một item')
      return
    }

    Modal.confirm({
      title: 'Xác nhận xóa vĩnh viễn',
      icon: <ExclamationCircleOutlined />,
      content: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedRowKeys.length} items? Hành động này không thể hoàn tác.`,
      okText: 'Xóa vĩnh viễn',
      okType: 'danger',
      cancelText: 'Hủy',
      async onOk() {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(
            `${apiBaseUrl}/soft-delete/${currentModel}/bulk/permanent`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ ids: selectedRowKeys })
            }
          )

          if (!response.ok) {
            throw new Error('Failed to bulk delete items')
          }

          message.success(`Xóa vĩnh viễn thành công ${selectedRowKeys.length} items!`)
          setSelectedRowKeys([])
          fetchDeletedItems()
        } catch (error) {
          message.error('Lỗi khi xóa vĩnh viễn hàng loạt: ' + (error as Error).message)
        }
      }
    })
  }

  const columns: ColumnsType<DeletedItem> = [
    {
      title: 'ID',
      dataIndex: '_id',
      key: '_id',
      width: 100,
      render: (text: string) => (
        <Typography.Text code>{text.substring(0, 8)}...</Typography.Text>
      )
    },
    {
      title: 'Tên',
      key: 'name',
      render: (record: DeletedItem) => 
        record.name || record.title || record.email || 'N/A'
    },
    {
      title: 'Ngày xóa',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      render: (date: string) => (
        <Tag color="orange">
          {new Date(date).toLocaleString('vi-VN')}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<UndoOutlined />}
            onClick={() => handleRestore(record._id)}
          >
            Khôi phục
          </Button>
          <Popconfirm
            title="Xóa vĩnh viễn"
            description="Bạn có chắc chắn muốn xóa vĩnh viễn item này?"
            onConfirm={() => handlePermanentDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okType="danger"
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              Xóa vĩnh viễn
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[])
    }
  }

  useEffect(() => {
    fetchDeletedItems()
  }, [currentModel, pagination.current, pagination.pageSize])

  const currentModelInfo = SUPPORTED_MODELS.find(m => m.key === currentModel)

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Title level={3}>
          {currentModelInfo?.icon} Quản lý {currentModelInfo?.label} đã xóa
        </Title>
        
        <Space style={{ marginBottom: 16 }}>
          <Select
            value={currentModel}
            onChange={(value) => {
              setCurrentModel(value)
              setSelectedRowKeys([])
              setPagination(prev => ({ ...prev, current: 1 }))
            }}
            style={{ width: 200 }}
          >
            {SUPPORTED_MODELS.map(model => (
              <Option key={model.key} value={model.key}>
                {model.icon} {model.label}
              </Option>
            ))}
          </Select>

          <Button
            type="primary"
            icon={<UndoOutlined />}
            onClick={handleBulkRestore}
            disabled={selectedRowKeys.length === 0}
          >
            Khôi phục đã chọn ({selectedRowKeys.length})
          </Button>

          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleBulkDelete}
            disabled={selectedRowKeys.length === 0}
          >
            Xóa vĩnh viễn đã chọn ({selectedRowKeys.length})
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDeletedItems}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={items}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `${range[0]}-${range[1]} của ${total} items`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({
              ...prev,
              current: page,
              pageSize: pageSize || 10
            }))
          }
        }}
      />
    </Card>
  )
}

export default SoftDeleteManager