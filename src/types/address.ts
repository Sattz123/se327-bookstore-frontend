export interface AddressPayload {
  label: string
  fullName: string
  phone: string | null
  addressLine: string
  city: string | null
  province: string | null
  postalCode: string | null
  isDefault: boolean
}

export interface Address extends AddressPayload {
  id: number
  createdAt: string
  updatedAt: string
}
