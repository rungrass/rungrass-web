import { useUserStore } from '@/store/user'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useMemo } from 'react'
import { MedalProfile } from './ProfileInfo'

interface ShareImageProps {
  activities: number
  totalDays: number
  year: string
  activityMap: Map<string, number>
  totalDistance: number | undefined
}

function MonthGrid({ month, year, activityMap }: { month: number; year: string; activityMap: Map<string, number> }) {
  const getIntensityColor = (distance: number) => {
    if (distance === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (distance < 5) return 'bg-green-100 dark:bg-green-900'
    if (distance < 10) return 'bg-green-300 dark:bg-green-700'
    if (distance < 15) return 'bg-green-500 dark:bg-green-600'
    return 'bg-green-700 dark:bg-green-500'
  }

  // 해당 월의 모든 날짜 생성
  const days = useMemo(() => {
    const start = startOfMonth(new Date(parseInt(year), month - 1))
    const end = endOfMonth(start)
    return eachDayOfInterval({ start, end })
  }, [year, month])

  // 첫 날의 요일 (0: 일요일, 6: 토요일)
  const startDay = days[0].getDay()

  return (
    <div className="grid grid-cols-7 gap-0.5 bg-gray-200 dark:bg-gray-700 p-0.5 rounded">
      {/* 빈 셀 채우기 */}
      {Array.from({ length: startDay }).map((_, i) => (
        <div key={`empty-${i}`} className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-sm" />
      ))}

      {/* 날짜 셀 */}
      {days.map((date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const distance = activityMap.get(dateStr) || 0

        return <div key={dateStr} className={`aspect-square ${getIntensityColor(distance)} rounded-sm`} />
      })}
    </div>
  )
}

export default function ShareImage({ activities, totalDays, year, activityMap, totalDistance }: ShareImageProps) {
  const { user } = useUserStore()

  const percentage = Math.round((activities / totalDays) * 100)

  const getLevelMessage = (percent: number) => {
    if (percent > 80) return '😮 와우 대단해요! 🏃💨 러닝이 곧 내 인생!'
    if (percent > 60) return '🤩 멋져요! 🏃💨 러닝은 식사다 🍚밥먹듯이 러닝!'
    if (percent > 40) return '😉 당신은 🏃💨 러닝의 진심이군요!'
    if (percent >= 20) return '🤗 잘하고 있어요, 🏃💨 러닝에 빠져드는 중!'
    return '🤥좀 더 노력해봐요, 👟아직은 런린이!'
  }

  const monthGroups = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12]
  ]

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg space-y-8 w-[600px]">
      <div className="flex items-center justify-center gap-8">
        <MedalProfile
          distance={totalDistance || 0}
          profileUrl={user?.profile || '/images/profile-default.png'}
          isImage
        />
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {user?.username || `${user?.firstname} ${user?.lastname}`}님의
          </h2>
          <p className="mt-1 text-3xl font-bold text-green-500 text-left">🏃‍♂️ 러닝 잔디밭 🌱</p>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
        <p className="text-2xl font-bold text-green-600 dark:text-green-400 pb-2">{getLevelMessage(percentage)}</p>
      </div>

      <div className="text-center text-2xl font-medium text-gray-700 dark:text-gray-300">
        {totalDays}일 중 {activities}개의 잔디를 심었습니다!
        <br />
        <span className="text-xl text-gray-500">(달성률: {percentage}%)</span>
      </div>

      <div className="space-y-8">
        {monthGroups.map((row, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            {row.map((month) => (
              <div key={month} className="space-y-3">
                <div className="text-center text-xl font-medium text-gray-600 dark:text-gray-400">{month}월</div>
                <MonthGrid month={month} year={year} activityMap={activityMap} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="text-lg text-gray-500 dark:text-gray-400 text-center pt-6">
        {format(new Date(), 'yyyy년 MM월 dd일', { locale: ko })} 기준
      </div>
    </div>
  )
}
