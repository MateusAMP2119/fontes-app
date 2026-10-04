import GlobeSvg from './openai-icons/Globe'
import MinusSvg from './openai-icons/Minus'
import StarSvg from './openai-icons/Star'
import StarFilledSvg from './openai-icons/StarFilled'
import DotsHorizontalSvg from './openai-icons/DotsHorizontal'
import ArrowUpRightSvg from './openai-icons/ArrowUpRight'
import DotsVerticalSvg from './openai-icons/DotsVertical'
import RegenerateSvg from './openai-icons/Regenerate'
import RegenerateOffSvg from './openai-icons/RegenerateOff'
import type { ComponentType, SVGProps } from 'react'
import AddSourcesSvg from './openai-icons/AddSources'
import AllGizmosSvg from './openai-icons/AllGizmos'
import AnalyticsSvg from './openai-icons/Analytics'
import ArrowDownSvg from './openai-icons/ArrowDown'
import ArrowRightSvg from './openai-icons/ArrowRight'
import ArrowUpSvg from './openai-icons/ArrowUp'
import BarChartSvg from './openai-icons/BarChart'
import CameraSvg from './openai-icons/Camera'
import CardSvg from './openai-icons/Card'
import ChartSvg from './openai-icons/Chart'
import CheckSvg from './openai-icons/Check'
import MembersSvg from './openai-icons/Members'
import ChevronRightSvg from './openai-icons/ChevronRight'
import ClockSvg from './openai-icons/Clock'
import CopySvg from './openai-icons/Copy'
import DesktopSvg from './openai-icons/Desktop'
import DownloadSvg from './openai-icons/Download'
import EditPencilSvg from './openai-icons/EditPencil'
import EmailSvg from './openai-icons/Email'
import ExclamationMarkCircleSvg from './openai-icons/ExclamationMarkCircle'
import ExitLogoutSvg from './openai-icons/ExitLogout'
import FileDocumentSvg from './openai-icons/FileDocument'
import FileBlankSvg from './openai-icons/FileBlank'
import FolderSvg from './openai-icons/Folder'
import FolderOpenSvg from './openai-icons/FolderOpen'
import FolderPlusSvg from './openai-icons/FolderPlus'
import HistorySvg from './openai-icons/History'
import HomeSvg from './openai-icons/Home'
import LightbulbSvg from './openai-icons/Lightbulb'
import LinkSvg from './openai-icons/Link'
import LockSvg from './openai-icons/Lock'
import MobileSvg from './openai-icons/Mobile'
import MoonSvg from './openai-icons/Moon'
import PlusSvg from './openai-icons/Plus'
import RadioSelectedSvg from './openai-icons/RadioSelected'
import ReloadSvg from './openai-icons/Reload'
import SearchSvg from './openai-icons/Search'
import NewsPaperSvg from './openai-icons/NewsPaper'
import SettingsCogSvg from './openai-icons/SettingsCog'
import SettingsSliderSvg from './openai-icons/SettingsSlider'
import ShareSvg from './openai-icons/Share'
import SidebarLeftSvg from './openai-icons/SidebarLeft'
import SidebarOpenLeftSvg from './openai-icons/SidebarOpenLeft'
import SparklesSvg from './openai-icons/Sparkles'
import StickyNoteSvg from './openai-icons/StickyNote'
import SunSvg from './openai-icons/Sun'
import TableCellsFilledSvg from './openai-icons/TableCellsFilled'
import TagSvg from './openai-icons/Tag'
import ThumbDownSvg from './openai-icons/ThumbDown'
import ThumbDownFilledSvg from './openai-icons/ThumbDownFilled'
import ThumbMixedSvg from './openai-icons/ThumbMixed'
import ThumbUpSvg from './openai-icons/ThumbUp'
import ThumbUpFilledSvg from './openai-icons/ThumbUpFilled'
import TrashSvg from './openai-icons/Trash'
import XSvg from './openai-icons/X'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number | string }

function icon(Component: ComponentType<SVGProps<SVGSVGElement>>) {
  return function Icon({ size, width = size ?? '1em', height = size ?? '1em', color, style, ...props }: IconProps) {
    return <Component width={width} height={height} style={{ ...style, color: style?.color ?? color ?? 'var(--icon-default-color, #919191)' }} aria-hidden={props['aria-label'] || props['aria-labelledby'] ? undefined : true} focusable="false" {...props} />
  }
}

export const Sync = icon(RegenerateSvg)
export const SyncOff = icon(RegenerateOffSvg)
export const AddSources = icon(AddSourcesSvg)
export const AllGizmos = icon(AllGizmosSvg)
export const Analytics = icon(AnalyticsSvg)
export const ArrowDown = icon(ArrowDownSvg)
export const Globe = icon(GlobeSvg)
export const ArrowRight = icon(ArrowRightSvg)
export const ArrowUp = icon(ArrowUpSvg)
export const BarChart = icon(BarChartSvg)
export const Camera = icon(CameraSvg)
export const Card = icon(CardSvg)
export const Chart = icon(ChartSvg)
export const Check = icon(CheckSvg)
export const Members = icon(MembersSvg)
export const ChevronRight = icon(ChevronRightSvg)
export const Clock = icon(ClockSvg)
export const Copy = icon(CopySvg)
export const Desktop = icon(DesktopSvg)
export const Download = icon(DownloadSvg)
export const EditPencil = icon(EditPencilSvg)
export const Email = icon(EmailSvg)
export const ExclamationMarkCircle = icon(ExclamationMarkCircleSvg)
export const ExitLogout = icon(ExitLogoutSvg)
export const FileDocument = icon(FileDocumentSvg)
export const FileBlank = icon(FileBlankSvg)
export const Folder = icon(FolderSvg)
export const FolderOpen = icon(FolderOpenSvg)
export const FolderPlus = icon(FolderPlusSvg)
export const History = icon(HistorySvg)
export const Home = icon(HomeSvg)
export const Lightbulb = icon(LightbulbSvg)
export const Link = icon(LinkSvg)
export const Lock = icon(LockSvg)
export const Mobile = icon(MobileSvg)
export const Moon = icon(MoonSvg)
export const Plus = icon(PlusSvg)
export const RadioSelected = icon(RadioSelectedSvg)
export const Reload = icon(ReloadSvg)
export const Search = icon(SearchSvg)
export const NewsPaper = icon(NewsPaperSvg)
export const SettingsCog = icon(SettingsCogSvg)
export const SettingsSlider = icon(SettingsSliderSvg)
export const Share = icon(ShareSvg)
export const SidebarLeft = icon(SidebarLeftSvg)
export const SidebarOpenLeft = icon(SidebarOpenLeftSvg)
export const Sparkles = icon(SparklesSvg)
export const StickyNote = icon(StickyNoteSvg)
export const Sun = icon(SunSvg)
export const TableCellsFilled = icon(TableCellsFilledSvg)
export const Tag = icon(TagSvg)
export const ThumbDown = icon(ThumbDownSvg)
export const ThumbDownFilled = icon(ThumbDownFilledSvg)
export const ThumbMixed = icon(ThumbMixedSvg)
export const ThumbUp = icon(ThumbUpSvg)
export const ThumbUpFilled = icon(ThumbUpFilledSvg)
export const Trash = icon(TrashSvg)
export const X = icon(XSvg)
export const Settings = SettingsCog
export const Monitor = Desktop
export const LogOut = ExitLogout
export const Share2 = Share
export const FileText = FileDocument
export const PanelLeftOpen = SidebarLeft
export const PanelLeftClose = SidebarOpenLeft
export const Rss = NewsPaper
export const Trash2 = Trash
export const CheckIcon = Check
export const ChevronRightIcon = ChevronRight
export const CircleIcon = RadioSelected
export const IconTrash = ({ size = 18, ...props }: IconProps) => <Trash size={size} {...props} />
export const IconClose = ({ size = 18, ...props }: IconProps) => <X size={size} {...props} />
export const IconSticky = ({ size = 18, ...props }: IconProps) => <StickyNote size={size} {...props} />
export const IconPen = ({ size = 18, ...props }: IconProps) => <EditPencil size={size} {...props} />
export const IconPlus = ({ size = 18, ...props }: IconProps) => <Plus size={size} {...props} />
export const IconShare = ({ size = 18, ...props }: IconProps) => <Share size={size} {...props} />
export const IconSliders = ({ size = 18, ...props }: IconProps) => <SettingsSlider size={size} {...props} />
export const IconGridDots = ({ size = 18, ...props }: IconProps) => <AllGizmos size={size} {...props} />
export const IconFolder = ({ size = 18, ...props }: IconProps) => <Folder size={size} {...props} />
export const IconFolderPlus = ({ size = 18, ...props }: IconProps) => <FolderPlus size={size} {...props} />
export const IconTag = ({ size = 18, ...props }: IconProps) => <Tag size={size} {...props} />
export const IconSearch = ({ size = 18, ...props }: IconProps) => <Search size={size} {...props} />
export const IconArrowUp = ({ size = 18, ...props }: IconProps) => <ArrowUp size={size} {...props} />
export const IconX = ({ size = 18, ...props }: IconProps) => <X size={size} {...props} />
export const IconPhone = ({ size = 18, ...props }: IconProps) => <Mobile size={size} {...props} />
export const IconCollaborate = ({ size = 18, ...props }: IconProps) => <Members size={size} {...props} />
export const IconDatabasePlus = ({ size = 18, ...props }: IconProps) => <AddSources size={size} {...props} />
export const IconClock = ({ size = 18, ...props }: IconProps) => <Clock size={size} {...props} />
export const IconSparkles = ({ size = 18, ...props }: IconProps) => <Sparkles size={size} {...props} />

export function IconSidebarToggle({ open, size = 18, ...props }: IconProps & { open: boolean }) {
  const Component = open ? SidebarOpenLeft : SidebarLeft
  return <Component size={size} {...props} />
}

export function IconLock({ locked, size = 18, ...props }: IconProps & { locked: boolean }) {
  const Component = locked ? Lock : EditPencil
  return <Component size={size} {...props} />
}

export const DotsVertical = icon(DotsVerticalSvg)

export const Star = icon(StarSvg)
export const StarFilled = icon(StarFilledSvg)
export const DotsHorizontal = icon(DotsHorizontalSvg)
export const ArrowUpRight = icon(ArrowUpRightSvg)

export const Minus = icon(MinusSvg)
