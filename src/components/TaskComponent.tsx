// Fetch suggestions from API
const fetchSuggestions = async () => {
  if (!task.title) return;
  
  setLoading(true);
  try {
    const response = await fetch('/api/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskTitle: task.title,
        userProfile: state.userProfile,
        implicitNeeds: state.userProfile.goals,
        recentFeedback: task.feedback && Array.isArray(task.feedback) && task.feedback.length > 0
          ? task.feedback.map(f => f.text).join('\n')
          : undefined,
        userContextHistory: state.userProfile.userContextHistory
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch suggestions');
    }
    
    const data = await response.json();
    setSuggestions(data.suggestions || []);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    toast({
      title: 'Error',
      description: 'Failed to fetch suggestions. Please try again.',
      status: 'error',
      duration: 3000,
      isClosable: true,
    });
  } finally {
    setLoading(false);
  }
};

// Fetch plan from API
const fetchPlan = async (suggestion: string) => {
  if (!task.title) return;
  
  setLoading(true);
  try {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: task.id,
        taskTitle: task.title,
        selectedSuggestion: suggestion,
        userProfile: state.userProfile,
        userContextHistory: state.userProfile.userContextHistory
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch plan');
    }
    
    const data = await response.json();
    
    // Add to user context history
    const contextUpdate = `[Task Plan] Generated plan for task "${task.title}" with suggestion "${suggestion}"`;
    dispatch({ type: 'ADD_TO_USER_CONTEXT_HISTORY', payload: contextUpdate });
    
    // Update task with plan
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        ...task,
        plan: data.plan,
        selectedSuggestion: suggestion,
      },
    });
    
    // Close suggestions modal
    onClose();
    
    // Show success message
    toast({
      title: 'Plan Generated',
      description: 'Your personalized plan is ready!',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    toast({
      title: 'Error',
      description: 'Failed to generate plan. Please try again.',
      status: 'error',
      duration: 3000,
      isClosable: true,
    });
  } finally {
    setLoading(false);
  }
}; 