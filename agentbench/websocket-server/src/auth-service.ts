import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// 用户信息
export interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'evaluator' | 'viewer'
  projectId?: string
  permissions: string[]
  createdAt: Date
  updatedAt: Date
}

// JWT载荷
export interface JWTPayload {
  userId: string
  username: string
  email: string
  role: string
  projectId?: string
  permissions: string[]
  iat: number
  exp: number
  jti: string
}

// 认证配置
export interface AuthConfig {
  jwtSecret: string
  jwtExpiry: number // 毫秒
  refreshExpiry: number // 毫秒
  issuer: string
  audience: string
}

// 令牌响应
export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

// 刷新令牌信息
export interface RefreshTokenInfo {
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  isRevoked: boolean
}

export class AuthenticationService {
  private config: AuthConfig
  private refreshTokens: Map<string, RefreshTokenInfo> = new Map()

  constructor(config: AuthConfig) {
    this.config = config
  }

  // 生成JWT访问令牌
  public generateAccessToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'> = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      projectId: user.projectId,
      permissions: user.permissions
    }

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiry / 1000,
      issuer: this.config.issuer,
      audience: this.config.audience,
      jwtid: this.generateJTI()
    })
  }

  // 生成刷新令牌
  public generateRefreshToken(user: User): string {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + this.config.refreshExpiry)
    
    const refreshTokenInfo: RefreshTokenInfo = {
      userId: user.id,
      token,
      expiresAt,
      createdAt: new Date(),
      isRevoked: false
    }
    
    this.refreshTokens.set(token, refreshTokenInfo)
    return token
  }

  // 生成完整的令牌响应
  public generateTokens(user: User): TokenResponse {
    const accessToken = this.generateAccessToken(user)
    const refreshToken = this.generateRefreshToken(user)
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.jwtExpiry,
      tokenType: 'Bearer'
    }
  }

  // 验证访问令牌
  public verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience
      }) as JWTPayload
      
      return decoded
    } catch (error) {
      this.log('Token verification failed:', error)
      return null
    }
  }

  // 验证刷新令牌
  public verifyRefreshToken(token: string): RefreshTokenInfo | null {
    const refreshTokenInfo = this.refreshTokens.get(token)
    
    if (!refreshTokenInfo) {
      return null
    }
    
    if (refreshTokenInfo.isRevoked) {
      this.refreshTokens.delete(token)
      return null
    }
    
    if (refreshTokenInfo.expiresAt < new Date()) {
      this.refreshTokens.delete(token)
      return null
    }
    
    return refreshTokenInfo
  }

  // 刷新访问令牌
  public refreshAccessToken(refreshToken: string): TokenResponse | null {
    const refreshTokenInfo = this.verifyRefreshToken(refreshToken)
    
    if (!refreshTokenInfo) {
      return null
    }
    
    // 生成新的访问令牌
    const newAccessToken = this.generateAccessToken({
      id: refreshTokenInfo.userId,
      username: '', // 这些信息在刷新时不需要
      email: '',
      role: 'evaluator',
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    } as User)
    
    return {
      accessToken: newAccessToken,
      refreshToken, // 保持相同的刷新令牌
      expiresIn: this.config.jwtExpiry,
      tokenType: 'Bearer'
    }
  }

  // 撤销刷新令牌
  public revokeRefreshToken(token: string): boolean {
    const refreshTokenInfo = this.refreshTokens.get(token)
    
    if (refreshTokenInfo) {
      refreshTokenInfo.isRevoked = true
      this.refreshTokens.delete(token)
      return true
    }
    
    return false
  }

  // 撤销用户的所有刷新令牌
  public revokeUserRefreshTokens(userId: string): number {
    let revokedCount = 0
    
    for (const [token, info] of this.refreshTokens.entries()) {
      if (info.userId === userId) {
        info.isRevoked = true
        this.refreshTokens.delete(token)
        revokedCount++
      }
    }
    
    return revokedCount
  }

  // 清理过期的刷新令牌
  public cleanupExpiredTokens(): number {
    let cleanedCount = 0
    const now = new Date()
    
    for (const [token, info] of this.refreshTokens.entries()) {
      if (info.expiresAt < now || info.isRevoked) {
        this.refreshTokens.delete(token)
        cleanedCount++
      }
    }
    
    return cleanedCount
  }

  // 生成WebSocket连接令牌
  public generateWebSocketToken(user: User): string {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      projectId: user.projectId,
      permissions: user.permissions,
      type: 'websocket'
    }

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: 15 * 60, // 15分钟
      issuer: this.config.issuer,
      audience: this.config.audience,
      jwtid: this.generateJTI()
    })
  }

  // 从请求头提取令牌
  public extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null
    }
    
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null
    }
    
    return parts[1]
  }

  // 验证WebSocket令牌
  public verifyWebSocketToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience
      }) as JWTPayload & { type?: string }
      
      // 确保是WebSocket令牌
      if (decoded.type !== 'websocket') {
        return null
      }
      
      return decoded
    } catch (error) {
      this.log('WebSocket token verification failed:', error)
      return null
    }
  }

  // 获取用户权限
  public getUserPermissions(user: User): string[] {
    const basePermissions = this.getRolePermissions(user.role)
    return [...basePermissions, ...user.permissions]
  }

  // 检查用户权限
  public hasPermission(user: User, permission: string): boolean {
    const userPermissions = this.getUserPermissions(user)
    return userPermissions.includes(permission) || userPermissions.includes('*')
  }

  // 检查项目访问权限
  public canAccessProject(user: User, projectId: string): boolean {
    if (user.role === 'admin') {
      return true
    }
    
    if (user.projectId === projectId) {
      return true
    }
    
    return this.hasPermission(user, 'access:all_projects')
  }

  // 获取角色基础权限
  private getRolePermissions(role: string): string[] {
    switch (role) {
      case 'admin':
        return [
          '*',
          'create:project',
          'read:project',
          'update:project',
          'delete:project',
          'create:test_case',
          'read:test_case',
          'update:test_case',
          'delete:test_case',
          'create:evaluation',
          'read:evaluation',
          'update:evaluation',
          'delete:evaluation',
          'manage:users',
          'manage:system'
        ]
        
      case 'evaluator':
        return [
          'create:project',
          'read:project',
          'update:project',
          'create:test_case',
          'read:test_case',
          'update:test_case',
          'create:evaluation',
          'read:evaluation',
          'update:evaluation',
          'websocket:connect'
        ]
        
      case 'viewer':
        return [
          'read:project',
          'read:test_case',
          'read:evaluation',
          'websocket:connect'
        ]
        
      default:
        return []
    }
  }

  // 生成JTI (JWT ID)
  private generateJTI(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  // 日志记录
  private log(message: string, ...args: any[]): void {
    console.log(`[AuthService] ${message}`, ...args)
  }

  // 获取统计信息
  public getStats() {
    return {
      activeRefreshTokens: this.refreshTokens.size,
      revokedTokens: Array.from(this.refreshTokens.values()).filter(t => t.isRevoked).length,
      expiredTokens: Array.from(this.refreshTokens.values()).filter(t => t.expiresAt < new Date()).length
    }
  }
}

// 默认配置
export const defaultAuthConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiry: 15 * 60 * 1000, // 15分钟
  refreshExpiry: 7 * 24 * 60 * 60 * 1000, // 7天
  issuer: 'agentbench',
  audience: 'agentbench-websocket'
}

// 示例用户数据
export const sampleUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@agentbench.com',
    role: 'admin',
    permissions: ['*'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    username: 'evaluator',
    email: 'evaluator@agentbench.com',
    role: 'evaluator',
    permissions: ['run:automated_tests'],
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    username: 'viewer',
    email: 'viewer@agentbench.com',
    role: 'viewer',
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]