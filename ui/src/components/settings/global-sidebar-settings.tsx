import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FolderPlus,
  PanelLeftClose,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  DefaultMenus,
  SidebarConfig,
  SidebarGroup,
  SidebarItem,
} from '@/types/sidebar'
import {
  getGlobalSidebarConfig,
  setGlobalSidebarConfig,
} from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CRDSelector } from '@/components/selector/crd-selector'

import {
  IconArrowsHorizontal,
  IconBell,
  IconBox,
  IconBoxMultiple,
  IconClockHour4,
  IconCode,
  IconDatabase,
  IconFileDatabase,
  IconKey,
  IconLoadBalancer,
  IconLock,
  IconMap,
  IconNetwork,
  IconPlayerPlay,
  IconRocket,
  IconRoute,
  IconRouter,
  IconServer2,
  IconShield,
  IconShieldCheck,
  IconStack2,
  IconTopologyBus,
  IconUser,
  IconUsers,
} from '@tabler/icons-react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  IconBox,
  IconRocket,
  IconStack2,
  IconTopologyBus,
  IconPlayerPlay,
  IconClockHour4,
  IconRouter,
  IconNetwork,
  IconLoadBalancer,
  IconRoute,
  IconFileDatabase,
  IconDatabase,
  IconMap,
  IconLock,
  IconUser,
  IconShield,
  IconUsers,
  IconShieldCheck,
  IconKey,
  IconBoxMultiple,
  IconServer2,
  IconBell,
  IconCode,
  IconArrowsHorizontal,
}

const CURRENT_CONFIG_VERSION = 1

const defaultMenus: DefaultMenus = {
  'sidebar.groups.workloads': [
    { titleKey: 'nav.pods', url: '/pods', icon: IconBox },
    { titleKey: 'nav.deployments', url: '/deployments', icon: IconRocket },
    {
      titleKey: 'nav.statefulsets',
      url: '/statefulsets',
      icon: IconStack2,
    },
    {
      titleKey: 'nav.daemonsets',
      url: '/daemonsets',
      icon: IconTopologyBus,
    },
    { titleKey: 'nav.jobs', url: '/jobs', icon: IconPlayerPlay },
    { titleKey: 'nav.cronjobs', url: '/cronjobs', icon: IconClockHour4 },
  ],
  'sidebar.groups.traffic': [
    { titleKey: 'nav.ingresses', url: '/ingresses', icon: IconRouter },
    { titleKey: 'nav.services', url: '/services', icon: IconNetwork },
    { titleKey: 'nav.gateways', url: '/gateways', icon: IconLoadBalancer },
    { titleKey: 'nav.httproutes', url: '/httproutes', icon: IconRoute },
  ],
  'sidebar.groups.storage': [
    {
      titleKey: 'sidebar.short.pvcs',
      url: '/persistentvolumeclaims',
      icon: IconFileDatabase,
    },
    {
      titleKey: 'sidebar.short.pvs',
      url: '/persistentvolumes',
      icon: IconDatabase,
    },
    {
      titleKey: 'nav.storageclasses',
      url: '/storageclasses',
      icon: IconFileDatabase,
    },
  ],
  'sidebar.groups.config': [
    { titleKey: 'nav.configMaps', url: '/configmaps', icon: IconMap },
    { titleKey: 'nav.secrets', url: '/secrets', icon: IconLock },
    {
      titleKey: 'nav.horizontalpodautoscalers',
      url: '/horizontalpodautoscalers',
      icon: IconArrowsHorizontal,
    },
  ],
  'sidebar.groups.security': [
    {
      titleKey: 'nav.serviceaccounts',
      url: '/serviceaccounts',
      icon: IconUser,
    },
    { titleKey: 'nav.roles', url: '/roles', icon: IconShield },
    { titleKey: 'nav.rolebindings', url: '/rolebindings', icon: IconUsers },
    {
      titleKey: 'nav.clusterroles',
      url: '/clusterroles',
      icon: IconShieldCheck,
    },
    {
      titleKey: 'nav.clusterrolebindings',
      url: '/clusterrolebindings',
      icon: IconKey,
    },
  ],
  'sidebar.groups.other': [
    {
      titleKey: 'nav.namespaces',
      url: '/namespaces',
      icon: IconBoxMultiple,
    },
    { titleKey: 'nav.nodes', url: '/nodes', icon: IconServer2 },
    { titleKey: 'nav.events', url: '/events', icon: IconBell },
    { titleKey: 'nav.crds', url: '/crds', icon: IconCode },
  ],
}

const getIconName = (iconComponent: React.ComponentType): string => {
  const entry = Object.entries(iconMap).find(
    ([, component]) => component === iconComponent
  )
  return entry ? entry[0] : 'IconBox'
}

const defaultConfigs = (): SidebarConfig => {
  const groups: SidebarGroup[] = []
  let groupOrder = 0

  Object.entries(defaultMenus).forEach(([groupKey, items]) => {
    const groupId = groupKey
      .toLowerCase()
      .replace(/\./g, '-')
      .replace(/\s+/g, '-')
    const sidebarItems: SidebarItem[] = items.map((item, index) => ({
      id: `${groupId}-${item.url.replace(/[^a-zA-Z0-9]/g, '-')}`,
      titleKey: item.titleKey,
      url: item.url,
      icon: getIconName(item.icon),
      visible: true,
      pinned: false,
      order: index,
    }))

    groups.push({
      id: groupId,
      nameKey: groupKey,
      items: sidebarItems,
      visible: true,
      collapsed: false,
      order: groupOrder++,
    })
  })

  return {
    version: CURRENT_CONFIG_VERSION,
    groups,
    hiddenItems: [],
    pinnedItems: [],
    groupOrder: groups.map((g) => g.id),
    lastUpdated: Date.now(),
  }
}

export function GlobalSidebarSettings() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [newGroupName, setNewGroupName] = useState('')
  const [selectedCRD, setSelectedCRD] = useState<{
    name: string
    kind: string
  }>()

  const getIconComponent = useCallback((iconName: string) => {
    return iconMap[iconName] || IconBox
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['global-sidebar-config'],
    queryFn: async () => {
      const res = await getGlobalSidebarConfig()
      if (res.config && res.config !== '') {
        return JSON.parse(res.config) as SidebarConfig
      }
      return defaultConfigs()
    },
  })

  const [config, setConfig] = useState<SidebarConfig | null>(null)

  useState(() => {
    if (data) {
      setConfig(data)
    }
  })

  const config_ = config || data || defaultConfigs()

  const saveMutation = useMutation({
    mutationFn: (newConfig: SidebarConfig) => {
      const configToSave = {
        ...newConfig,
        lastUpdated: Date.now(),
        version: CURRENT_CONFIG_VERSION,
      }
      return setGlobalSidebarConfig(JSON.stringify(configToSave))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-sidebar-config'] })
      toast.success(t('globalSidebar.saved', 'Global sidebar config saved'))
    },
    onError: () => {
      toast.error(t('globalSidebar.saveError', 'Failed to save config'))
    },
  })

  const handleSave = () => {
    if (config_) {
      saveMutation.mutate(config_)
    }
  }

  const handleResetToDefault = () => {
    setConfig(defaultConfigs())
    toast.info(t('globalSidebar.resetInfo', 'Reset to default - click Save to apply'))
  }

  const toggleItemVisibility = (itemId: string) => {
    if (!config_) return
    const hiddenItems = new Set(config_.hiddenItems)
    if (hiddenItems.has(itemId)) {
      hiddenItems.delete(itemId)
    } else {
      hiddenItems.add(itemId)
    }
    setConfig({ ...config_, hiddenItems: Array.from(hiddenItems) })
  }

  const toggleItemPin = (itemId: string) => {
    if (!config_) return
    const pinnedItems = new Set(config_.pinnedItems)
    if (pinnedItems.has(itemId)) {
      pinnedItems.delete(itemId)
    } else {
      pinnedItems.add(itemId)
    }
    setConfig({ ...config_, pinnedItems: Array.from(pinnedItems) })
  }

  const toggleGroupVisibility = (groupId: string) => {
    if (!config_) return
    const groups = config_.groups.map((group) =>
      group.id === groupId ? { ...group, visible: !group.visible } : group
    )
    setConfig({ ...config_, groups })
  }

  const toggleGroupCollapse = (groupId: string) => {
    if (!config_) return
    const groups = config_.groups.map((group) =>
      group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
    )
    setConfig({ ...config_, groups })
  }

  const moveGroup = (groupId: string, direction: 'up' | 'down') => {
    if (!config_) return
    const sortedGroups = [...config_.groups].sort((a, b) => a.order - b.order)
    const currentIndex = sortedGroups.findIndex((g) => g.id === groupId)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sortedGroups.length) return

    const reordered = [...sortedGroups]
    const [movedGroup] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, movedGroup)

    const groups = reordered.map((group, index) => ({
      ...group,
      order: index,
    }))
    const groupOrder = groups.map((g) => g.id)
    setConfig({ ...config_, groups, groupOrder })
  }

  const createCustomGroup = (groupName: string) => {
    if (!config_) return
    const groupId = `custom-${groupName.toLowerCase().replace(/\s+/g, '-')}`
    if (config_.groups.find((g) => g.id === groupId)) return

    const newGroup: SidebarGroup = {
      id: groupId,
      nameKey: groupName,
      items: [],
      visible: true,
      collapsed: false,
      order: config_.groups.length,
      isCustom: true,
    }
    const groups = [...config_.groups, newGroup]
    setConfig({ ...config_, groups, groupOrder: [...config_.groupOrder, groupId] })
  }

  const addCRDToGroup = (groupId: string, crdName: string, kind: string) => {
    if (!config_) return
    const groups = config_.groups.map((group) => {
      if (group.id === groupId) {
        const itemId = `${groupId}-${crdName.replace(/[^a-zA-Z0-9]/g, '-')}`
        if (group.items.find((item) => item.id === itemId)) return group

        const newItem: SidebarItem = {
          id: itemId,
          titleKey: kind,
          url: `/crds/${crdName}`,
          icon: 'IconCode',
          visible: true,
          pinned: false,
          order: group.items.length,
        }
        return { ...group, items: [...group.items, newItem] }
      }
      return group
    })
    setConfig({ ...config_, groups })
  }

  const removeCustomGroup = (groupId: string) => {
    if (!config_) return
    const groups = config_.groups.filter((g) => g.id !== groupId)
    const groupOrder = config_.groupOrder.filter((id) => id !== groupId)
    const groupItemIds = config_.groups
      .find((g) => g.id === groupId)
      ?.items.map((item) => item.id) || []
    const pinnedItems = config_.pinnedItems.filter(
      (itemId) => !groupItemIds.includes(itemId)
    )
    const hiddenItems = config_.hiddenItems.filter(
      (itemId) => !groupItemIds.includes(itemId)
    )
    setConfig({ ...config_, groups, groupOrder, pinnedItems, hiddenItems })
  }

  const removeCRDFromGroup = (groupId: string, itemId: string) => {
    if (!config_) return
    const groups = config_.groups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          items: group.items.filter((item) => item.id !== itemId),
        }
      }
      return group
    })
    const pinnedItems = config_.pinnedItems.filter((item) => item !== itemId)
    const hiddenItems = config_.hiddenItems.filter((item) => item !== itemId)
    setConfig({ ...config_, groups, pinnedItems, hiddenItems })
  }

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createCustomGroup(newGroupName.trim())
      setNewGroupName('')
    }
  }

  const handleAddCRDToGroup = (groupId: string) => {
    if (selectedCRD && groupId) {
      addCRDToGroup(groupId, selectedCRD.name, selectedCRD.kind)
      setSelectedCRD(undefined)
    }
  }

  const pinnedItems = useMemo(() => {
    return config_.groups
      .flatMap((group) => group.items)
      .filter((item) => config_.pinnedItems.includes(item.id))
  }, [config_])

  const sortedGroups = useMemo(() => {
    return [...config_.groups].sort((a, b) => a.order - b.order)
  }, [config_])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">
          {t('common.loading', 'Loading...')}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PanelLeftClose className="h-5 w-5" />
                {t('globalSidebar.title', 'Global Sidebar Configuration')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t(
                  'globalSidebar.description',
                  'Configure the default sidebar for all users. Users can still customize their own sidebar.'
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetToDefault} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t('sidebar.resetToDefault', 'Reset to Default')}
              </Button>
              <Button onClick={handleSave} className="gap-2" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {pinnedItems.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Pin className="h-4 w-4" />
                    {t('sidebar.pinnedItems', 'Pinned Items')} ({pinnedItems.length})
                  </Label>
                  <div className="space-y-2">
                    {pinnedItems.map((item) => {
                      const IconComponent = getIconComponent(item.icon)
                      const title = item.titleKey
                        ? t(item.titleKey, { defaultValue: item.titleKey })
                        : ''
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 border rounded-md bg-muted/20"
                        >
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-sidebar-primary" />
                            <span className="text-sm">{title}</span>
                            <Badge variant="outline" className="text-xs">
                              {t('sidebar.pinned', 'Pinned')}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleItemPin(item.id)}
                            className="h-8 w-8 p-0"
                          >
                            <PinOff className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}

            <div className="space-y-4">
              <Label className="text-sm font-medium">
                {t('sidebar.menuGroups', 'Menu Groups')}
              </Label>

              {sortedGroups.map((group, index) => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">
                        {group.nameKey
                          ? t(group.nameKey, { defaultValue: group.nameKey })
                          : ''}
                      </h4>
                      {group.isCustom && (
                        <Badge variant="outline" className="text-xs">
                          Custom
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {
                          group.items.filter(
                            (item) => !config_.hiddenItems.includes(item.id)
                          ).length
                        }
                        /{group.items.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroupCollapse(group.id)}
                        className="h-8 px-2 text-xs"
                      >
                        {group.collapsed
                          ? t('sidebar.expand', 'Expand')
                          : t('sidebar.collapse', 'Collapse')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroupVisibility(group.id)}
                        className="h-8 w-8 p-0"
                        title={group.visible ? 'Hide' : 'Show'}
                      >
                        {!group.visible ? (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveGroup(group.id, 'up')}
                        className="h-8 w-8 p-0"
                        title={t('sidebar.moveUp', 'Move up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveGroup(group.id, 'down')}
                        className="h-8 w-8 p-0"
                        title={t('sidebar.moveDown', 'Move down')}
                        disabled={index === sortedGroups.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      {group.isCustom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomGroup(group.id)}
                          className="h-8 w-8 p-0"
                          title="Delete custom group"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div
                    className={`grid gap-2 pl-4 ${group.collapsed ? 'hidden' : ''} ${!group.visible ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {group.items.map((item) => {
                      const IconComponent = getIconComponent(item.icon)
                      const isHidden = config_.hiddenItems.includes(item.id)
                      const isPinned = config_.pinnedItems.includes(item.id)
                      const title = item.titleKey
                        ? t(item.titleKey, { defaultValue: item.titleKey })
                        : ''

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded border transition-colors ${
                            isHidden ? 'opacity-50 bg-muted/10' : 'bg-background'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-sidebar-primary" />
                            <span className="text-sm">{title}</span>
                            {isPinned && (
                              <Badge variant="secondary" className="text-xs">
                                <Pin className="h-3 w-3 mr-1" />
                                {t('sidebar.pinned', 'Pinned')}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleItemPin(item.id)}
                              className={`h-8 w-8 p-0 ${isPinned ? 'text-primary' : 'text-muted-foreground'}`}
                              title={isPinned ? 'Unpin' : 'Pin to top'}
                            >
                              {isPinned ? (
                                <PinOff className="h-3.5 w-3.5" />
                              ) : (
                                <Pin className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            {group.isCustom ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCRDFromGroup(group.id, item.id)}
                                className="h-8 w-8 p-0"
                                title="Remove from group"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleItemVisibility(item.id)}
                                className="h-8 w-8 p-0"
                                title={isHidden ? 'Show' : 'Hide'}
                              >
                                {isHidden ? (
                                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {group.isCustom && (
                      <div className="flex gap-2 p-2 border rounded bg-muted/5">
                        <CRDSelector
                          selectedCRD={selectedCRD?.name || ''}
                          onCRDChange={(crdName, kind) =>
                            setSelectedCRD({
                              name: crdName,
                              kind: kind,
                            })
                          }
                          placeholder="Select CRD to add..."
                        />
                        <Button
                          onClick={() => handleAddCRDToGroup(group.id)}
                          disabled={!selectedCRD}
                          size="sm"
                          className="gap-2"
                          title="Add CRD to group"
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-3 p-4 border rounded-md bg-muted/10">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <FolderPlus className="h-4 w-4" />
                  {t('sidebar.createGroup', 'Create New CRD Group')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Group name (e.g., CRDs)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateGroup()
                      }
                    }}
                  />
                  <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}