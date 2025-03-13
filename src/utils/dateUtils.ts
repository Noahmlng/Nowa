/**
 * Date utility functions for the application
 */
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  format,
  parseISO,
  isValid
} from "date-fns";
import { zhCN } from "date-fns/locale";

/**
 * 将时间描述转换为具体的日期
 * @param timelineDesc 时间描述，例如"本周"、"下个月"、"周一/周三/周五"
 * @returns ISO 格式的日期字符串
 */
export function convertTimelineToDate(timelineDesc: string): string | undefined {
  if (!timelineDesc || timelineDesc.trim() === '') return undefined;
  
  const now = new Date();
  const lowerDesc = timelineDesc.toLowerCase();
  
  // 记录时间转换的调试信息
  console.log(`Converting timeline: "${timelineDesc}"`);

  // 处理简单的时间描述
  if (lowerDesc.includes('今天') || lowerDesc === '今日' || lowerDesc === 'today') {
    console.log(`- Matched "今天": ${format(now, 'yyyy-MM-dd')}`);
    return now.toISOString();
  }
  
  if (lowerDesc.includes('明天') || lowerDesc === 'tomorrow') {
    const tomorrow = addDays(now, 1);
    console.log(`- Matched "明天": ${format(tomorrow, 'yyyy-MM-dd')}`);
    return tomorrow.toISOString();
  }
  
  if (lowerDesc.includes('本周') || lowerDesc === 'this week') {
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
    console.log(`- Matched "本周": ${format(endOfThisWeek, 'yyyy-MM-dd')}`);
    return endOfThisWeek.toISOString();
  }
  
  if (lowerDesc.includes('下周') || lowerDesc === 'next week') {
    const nextWeek = addWeeks(now, 1);
    const endOfNextWeek = endOfWeek(nextWeek, { weekStartsOn: 1 });
    console.log(`- Matched "下周": ${format(endOfNextWeek, 'yyyy-MM-dd')}`);
    return endOfNextWeek.toISOString();
  }

  if (lowerDesc.includes('下两周') || lowerDesc === 'in two weeks') {
    const twoWeeksLater = addWeeks(now, 2);
    const endOfTwoWeeks = endOfWeek(twoWeeksLater, { weekStartsOn: 1 });
    console.log(`- Matched "下两周": ${format(endOfTwoWeeks, 'yyyy-MM-dd')}`);
    return endOfTwoWeeks.toISOString();
  }
  
  if (lowerDesc.includes('本月') || lowerDesc === 'this month') {
    const endOfThisMonth = endOfMonth(now);
    console.log(`- Matched "本月": ${format(endOfThisMonth, 'yyyy-MM-dd')}`);
    return endOfThisMonth.toISOString();
  }
  
  if (lowerDesc.includes('下个月') || lowerDesc === 'next month') {
    const nextMonth = addMonths(now, 1);
    const endOfNextMonth = endOfMonth(nextMonth);
    console.log(`- Matched "下个月": ${format(endOfNextMonth, 'yyyy-MM-dd')}`);
    return endOfNextMonth.toISOString();
  }
  
  // 处理具体星期几的情况
  if (lowerDesc.includes('周一') || lowerDesc.includes('monday')) {
    const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const nextMonday = addDays(thisWeek, 0);
    if (nextMonday.getTime() < now.getTime()) {
      // 如果这周的周一已经过了，取下周的周一
      const monday = addWeeks(nextMonday, 1);
      console.log(`- Matched "周一" (next week): ${format(monday, 'yyyy-MM-dd')}`);
      return monday.toISOString();
    }
    console.log(`- Matched "周一" (this week): ${format(nextMonday, 'yyyy-MM-dd')}`);
    return nextMonday.toISOString();
  }
  
  if (lowerDesc.includes('周二') || lowerDesc.includes('tuesday')) {
    const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const nextTuesday = addDays(thisWeek, 1);
    if (nextTuesday.getTime() < now.getTime()) {
      // 如果这周的周二已经过了，取下周的周二
      const tuesday = addWeeks(nextTuesday, 1);
      console.log(`- Matched "周二" (next week): ${format(tuesday, 'yyyy-MM-dd')}`);
      return tuesday.toISOString();
    }
    console.log(`- Matched "周二" (this week): ${format(nextTuesday, 'yyyy-MM-dd')}`);
    return nextTuesday.toISOString();
  }
  
  if (lowerDesc.includes('周三') || lowerDesc.includes('wednesday')) {
    const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const nextWednesday = addDays(thisWeek, 2);
    if (nextWednesday.getTime() < now.getTime()) {
      // 如果这周的周三已经过了，取下周的周三
      const wednesday = addWeeks(nextWednesday, 1);
      console.log(`- Matched "周三" (next week): ${format(wednesday, 'yyyy-MM-dd')}`);
      return wednesday.toISOString();
    }
    console.log(`- Matched "周三" (this week): ${format(nextWednesday, 'yyyy-MM-dd')}`);
    return nextWednesday.toISOString();
  }
  
  if (lowerDesc.includes('周四') || lowerDesc.includes('thursday')) {
    const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const nextThursday = addDays(thisWeek, 3);
    if (nextThursday.getTime() < now.getTime()) {
      // 如果这周的周四已经过了，取下周的周四
      const thursday = addWeeks(nextThursday, 1);
      console.log(`- Matched "周四" (next week): ${format(thursday, 'yyyy-MM-dd')}`);
      return thursday.toISOString();
    }
    console.log(`- Matched "周四" (this week): ${format(nextThursday, 'yyyy-MM-dd')}`);
    return nextThursday.toISOString();
  }
  
  if (lowerDesc.includes('周五') || lowerDesc.includes('friday')) {
    const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const nextFriday = addDays(thisWeek, 4);
    if (nextFriday.getTime() < now.getTime()) {
      // 如果这周的周五已经过了，取下周的周五
      const friday = addWeeks(nextFriday, 1);
      console.log(`- Matched "周五" (next week): ${format(friday, 'yyyy-MM-dd')}`);
      return friday.toISOString();
    }
    console.log(`- Matched "周五" (this week): ${format(nextFriday, 'yyyy-MM-dd')}`);
    return nextFriday.toISOString();
  }
  
  if (lowerDesc.includes('周六') || lowerDesc.includes('saturday')) {
    const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const nextSaturday = addDays(thisWeek, 5);
    if (nextSaturday.getTime() < now.getTime()) {
      // 如果这周的周六已经过了，取下周的周六
      const saturday = addWeeks(nextSaturday, 1);
      console.log(`- Matched "周六" (next week): ${format(saturday, 'yyyy-MM-dd')}`);
      return saturday.toISOString();
    }
    console.log(`- Matched "周六" (this week): ${format(nextSaturday, 'yyyy-MM-dd')}`);
    return nextSaturday.toISOString();
  }
  
  if (lowerDesc.includes('周日') || lowerDesc.includes('sunday')) {
    const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const nextSunday = addDays(thisWeek, 6);
    if (nextSunday.getTime() < now.getTime()) {
      // 如果这周的周日已经过了，取下周的周日
      const sunday = addWeeks(nextSunday, 1);
      console.log(`- Matched "周日" (next week): ${format(sunday, 'yyyy-MM-dd')}`);
      return sunday.toISOString();
    }
    console.log(`- Matched "周日" (this week): ${format(nextSunday, 'yyyy-MM-dd')}`);
    return nextSunday.toISOString();
  }
  
  // 处理"每天"或"持续进行"的情况
  if (lowerDesc.includes('每天') || lowerDesc.includes('daily') || lowerDesc === 'everyday') {
    // 设置为一个星期后
    const oneWeekLater = addWeeks(now, 1);
    console.log(`- Matched "每天": ${format(oneWeekLater, 'yyyy-MM-dd')} (setting to 1 week later)`);
    return oneWeekLater.toISOString();
  }
  
  if (lowerDesc.includes('持续') || lowerDesc.includes('ongoing')) {
    // 设置为一个月后
    const oneMonthLater = addMonths(now, 1);
    console.log(`- Matched "持续进行": ${format(oneMonthLater, 'yyyy-MM-dd')} (setting to 1 month later)`);
    return oneMonthLater.toISOString();
  }
  
  // 尝试处理多个星期几组合的情况 (周一/周三/周五)
  const weekdayPattern = /(周[一二三四五六日])\/(周[一二三四五六日])(\/(周[一二三四五六日]))?/;
  const weekdayMatch = lowerDesc.match(weekdayPattern);
  if (weekdayMatch) {
    // 取第一个星期几作为截止日期
    const firstDay = weekdayMatch[1];
    console.log(`- Matched multiple weekdays: "${weekdayMatch[0]}", using first: "${firstDay}"`);
    return convertTimelineToDate(firstDay);
  }
  
  // 处理"每周"的情况
  if (lowerDesc.includes('每周')) {
    // 设置为一周后
    const oneWeekLater = addWeeks(now, 1);
    console.log(`- Matched "每周": ${format(oneWeekLater, 'yyyy-MM-dd')} (setting to 1 week later)`);
    return oneWeekLater.toISOString();
  }

  // 处理"每月"的情况
  if (lowerDesc.includes('每月')) {
    // 设置为一个月后
    const oneMonthLater = addMonths(now, 1);
    console.log(`- Matched "每月": ${format(oneMonthLater, 'yyyy-MM-dd')} (setting to 1 month later)`);
    return oneMonthLater.toISOString();
  }
  
  // 默认情况：如果无法识别，返回一周后作为默认截止日期
  const defaultDate = addWeeks(now, 1);
  console.log(`- No match found, using default date: ${format(defaultDate, 'yyyy-MM-dd')} (1 week later)`);
  return defaultDate.toISOString();
}

/**
 * 格式化日期显示，根据与当前日期的距离显示不同格式
 * @param dateString ISO 格式的日期字符串
 * @returns 格式化后的日期字符串
 */
export function formatDateDisplay(dateString: string | undefined): string {
  if (!dateString) return '未设置日期';
  
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '日期无效';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = addDays(today, 1);
    const nextWeek = addWeeks(today, 1);
    
    // 获取只包含日期部分的对象，用于比较
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (dateOnly.getTime() === today.getTime()) {
      return '今天';
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      return '明天';
    } else if (dateOnly < nextWeek) {
      // 本周内的日期显示星期几
      return format(date, 'EEEE', { locale: zhCN });
    } else {
      // 超过一周的日期显示具体日期
      return format(date, 'MM月dd日');
    }
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '日期错误';
  }
} 