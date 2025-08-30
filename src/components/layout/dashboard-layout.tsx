'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  NavigationMenu, 
  NavigationMenuContent, 
  NavigationMenuItem, 
  NavigationMenuLink, 
  NavigationMenuList, 
  NavigationMenuTrigger 
} from '@/components/ui/navigation-menu'
import { User, LogOut, Settings, Calendar, Users } from 'lucide-react'
import Link from 'next/link'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const user = session?.user as any

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-semibold text-gray-900">
                Nurse Scheduler
              </Link>
              <span className="ml-2 text-sm text-gray-500">
                {user?.hospital}
              </span>
            </div>

            {/* Navigation */}
            <NavigationMenu>
              <NavigationMenuList>
                {user?.role === 'SCHEDULER' && (
                  <>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger>Scheduling</NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid gap-3 p-4 w-[400px]">
                          <NavigationMenuLink asChild>
                            <Link 
                              href="/dashboard/scheduler/blocks"
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none flex items-center">
                                <Calendar className="mr-2 h-4 w-4" />
                                Scheduling Blocks
                              </div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                Create and manage scheduling periods
                              </p>
                            </Link>
                          </NavigationMenuLink>
                          <NavigationMenuLink asChild>
                            <Link 
                              href="/dashboard/scheduler/nurses"
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none flex items-center">
                                <Users className="mr-2 h-4 w-4" />
                                Nurse Management
                              </div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                Manage nurse profiles and qualifications
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </>
                )}
              </NavigationMenuList>
            </NavigationMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  {user?.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <div className="font-medium">{user?.name}</div>
                    <div className="text-sm text-gray-500">{user?.email}</div>
                    <div className="text-xs text-gray-400 capitalize">{user?.role?.toLowerCase()}</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}