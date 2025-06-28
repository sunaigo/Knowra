"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { post } from "@/lib/request"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from "framer-motion"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isRegister, setIsRegister] = useState(false)
  // 登录表单
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // 注册表单
  const [regUsername, setRegUsername] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState("")
  const router = useRouter()
  const { t } = useTranslation('common')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const data = await post("/users/login", { username, password }, { form: true })
      if (data.code === 200 && data.data?.access_token) {
        localStorage.setItem("token", data.data.access_token)
        // 登录成功后不再主动获取用户信息，交由 layout 处理
        router.replace("/")
      } else {
        setError(data.message || t('login_failed'))
      }
    } catch (err: any) {
      setError(err.message || t('network_error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegLoading(true)
    setRegError("")
    if (!regUsername.trim() || !regPassword.trim()) {
      setRegError(t('register_required'))
      setRegLoading(false)
      return
    }
    try {
      const data = await post("/users/register", { username: regUsername, password: regPassword, email: regEmail })
      if (data.code === 200) {
        setIsRegister(false)
        setUsername(regUsername)
        setPassword("")
        setRegUsername("")
        setRegPassword("")
        setRegEmail("")
        setRegError("")
      } else {
        setRegError(data.message || t('register_failed'))
      }
    } catch (err: any) {
      setRegError(err.message || t('network_error'))
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="relative w-[380px] max-w-full h-[420px]">
        <div className="perspective-1000 w-full">
          <motion.div
            className="w-full relative"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: isRegister ? 180 : 0 }}
            initial={false}
            transition={{ duration: 0.6 }}
          >
            {/* 登录表单正面 */}
            <div
              className="absolute top-0 left-0 w-full"
              style={{ backfaceVisibility: "hidden" }}
            >
              <Card className="w-full flex flex-col justify-center">
                <CardHeader>
                  <CardTitle>{t('login_title')}</CardTitle>
                  <CardDescription>
                    {t('login_desc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin}>
                    <div className="flex flex-col gap-6">
                      <div className="grid gap-3">
                        <Label htmlFor="username">{t('username')}</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder={t('username_placeholder')}
                          required
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-3">
                        <div className="flex items-center">
                          <Label htmlFor="password">{t('password')}</Label>
                          <a
                            href="#"
                            className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                          >
                            {t('forgot_password')}
                          </a>
                        </div>
                        <Input
                          id="password"
                          type="password"
                          required
                          placeholder={t('password_placeholder')}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-3">
                        {error && (
                          <div className="text-red-500 text-sm text-center">{error}</div>
                        )}
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? t('logging_in') : t('login')}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 text-center text-sm">
                      {t('no_account')} {" "}
                      <a href="#" className="underline underline-offset-4" onClick={e => { e.preventDefault(); setIsRegister(true) }}>
                        {t('sign_up')}
                      </a>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
            {/* 注册表单背面 */}
            <div
              className="absolute top-0 left-0 w-full"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <Card className="w-full flex flex-col justify-center">
                <CardHeader>
                  <CardTitle>{t('register_title')}</CardTitle>
                  <CardDescription>
                    {t('register_desc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister}>
                    <div className="flex flex-col gap-6">
                      <div className="grid gap-3">
                        <Label htmlFor="reg-username">{t('username')}</Label>
                        <Input
                          id="reg-username"
                          type="text"
                          placeholder={t('username_placeholder')}
                          required
                          value={regUsername}
                          onChange={e => setRegUsername(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="reg-password">{t('password')}</Label>
                        <Input
                          id="reg-password"
                          type="password"
                          required
                          placeholder={t('password_placeholder')}
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="reg-email">{t('email')}</Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder={t('email_placeholder')}
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-3">
                        {regError && (
                          <div className="text-red-500 text-sm text-center">{regError}</div>
                        )}
                        <Button type="submit" className="w-full" disabled={regLoading}>
                          {regLoading ? t('registering') : t('register')}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 text-center text-sm">
                      {t('have_account')} {" "}
                      <a href="#" className="underline underline-offset-4" onClick={e => { e.preventDefault(); setIsRegister(false) }}>
                        {t('login')}
                      </a>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  )
}
