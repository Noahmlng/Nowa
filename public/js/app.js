/**
 * Nowa - AI驱动的待办事项应用
 * 主应用脚本 - 初始化和组织各个组件
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    // 初始化组件实例
    initializeApp();
    
    // 初始化示例数据（如果是首次运行）
    initializeSampleData();
});

/**
 * 初始化应用
 */
function initializeApp() {
    try {
        // 创建Todo应用实例
        window.todoApp = new Todo();
        console.log('应用已初始化');
    } catch (error) {
        console.error('初始化应用时发生错误:', error);
        showErrorMessage(`初始化应用时发生错误: ${error.message}`);
    }
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
function showErrorMessage(message) {
    if (window.modalComponent) {
        window.modalComponent.show('发生错误', `<p class="error-message">${message}</p>`, null, { showSaveButton: false });
    } else {
        alert(message);
    }
}

/**
 * 初始化示例数据
 */
function initializeSampleData() {
    // 检查是否已经有数据
    const hasData = localStorage.getItem('nowa_initialized');
    if (hasData) return;
    
    console.log('初始化示例数据...');
    
    const storageService = new StorageService();
    
    // 创建示例清单
    const defaultList = storageService.getDefaultList();
    const importantList = new List({
        name: '重要',
        color: '#E74856',
        icon: 'star',
        sortOrder: 2
    });
    
    storageService.saveList(importantList);
    
    // 创建示例目标
    const goals = [
        new Goal({
            title: '学习前端开发',
            description: '掌握现代前端开发技术栈，包括HTML5, CSS3, JavaScript (ES6+), React等',
            type: 'learning',
            priority: 3, // 高优先级
            status: 'in-progress',
            totalTasks: 3,
            completedTasks: 1
        }),
        new Goal({
            title: '保持健康作息',
            description: '每天保证7-8小时睡眠，定期锻炼，均衡饮食',
            type: 'health',
            priority: 2, // 中优先级
            status: 'in-progress',
            totalTasks: 2,
            completedTasks: 0
        }),
        new Goal({
            title: '完成个人网站',
            description: '设计并开发个人展示网站，展示作品和技能',
            type: 'work',
            priority: 2, // 中优先级
            status: 'not-started',
            totalTasks: 1,
            completedTasks: 0
        })
    ];
    
    // 保存目标
    goals.forEach(goal => storageService.saveGoal(goal));
    
    // 创建示例任务
    const tasks = [
        new Task({
            title: '学习React Hooks',
            description: '掌握React Hooks的基本概念和使用方法',
            priority: 3, // 高优先级
            goalId: goals[0].id,
            listId: defaultList.id,
            completed: true,
            inProgress: false,
            feedback: []
        }),
        new Task({
            title: '学习Vue.js基础',
            description: '了解Vue.js的核心概念和基本用法',
            priority: 2, // 中优先级
            goalId: goals[0].id,
            listId: importantList.id,
            myDay: true,
            completed: false,
            inProgress: true,
            feedback: []
        }),
        new Task({
            title: '学习TypeScript',
            description: '掌握TypeScript的类型系统和高级特性',
            priority: 2, // 中优先级
            goalId: goals[0].id,
            listId: defaultList.id,
            completed: false,
            inProgress: false,
            feedback: []
        }),
        new Task({
            title: '每天喝2升水',
            description: '保持良好的水分摄入',
            priority: 2, // 中优先级
            goalId: goals[1].id,
            listId: defaultList.id,
            myDay: true,
            completed: false,
            inProgress: false,
            feedback: []
        }),
        new Task({
            title: '每周锻炼3次',
            description: '每次30分钟以上的有氧运动',
            priority: 3, // 高优先级
            goalId: goals[1].id,
            listId: importantList.id,
            completed: false,
            inProgress: false,
            feedback: []
        }),
        new Task({
            title: '设计网站线框图',
            description: '为个人网站设计基本布局和UI元素',
            priority: 2, // 中优先级
            goalId: goals[2].id,
            listId: defaultList.id,
            completed: false,
            inProgress: false,
            feedback: []
        }),
        new Task({
            title: '购买水果',
            description: '买苹果、香蕉和橙子',
            priority: 1, // 低优先级
            listId: defaultList.id,
            myDay: true,
            completed: false,
            inProgress: false,
            feedback: []
        })
    ];
    
    // 保存任务
    tasks.forEach(task => {
        storageService.saveTask(task);
        
        // 更新清单中的任务引用
        if (task.listId) {
            const list = storageService.getListById(task.listId);
            if (list) {
                list.addTask(task.id);
                storageService.saveList(list);
            }
        }
    });
    
    // 标记已初始化
    localStorage.setItem('nowa_initialized', 'true');
    
    console.log('示例数据初始化完成');
} 