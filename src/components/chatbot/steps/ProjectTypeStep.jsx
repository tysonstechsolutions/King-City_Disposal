'use client'

import { Home, Hammer, HardHat, Building2, Package } from 'lucide-react'
import { useChatbot } from '../ChatbotContext'

const projectIcons = {
  cleanout: Home,
  renovation: Hammer,
  roofing: HardHat,
  construction: Building2,
  other: Package
}

export default function ProjectTypeStep() {
  const {
    isTyping,
    step,
    messages,
    config,
    STEPS,
    setBookingData,
    addUserMessage,
    addBotMessage,
    setStep,
  } = useChatbot()

  const handleProjectType = async (projectType) => {
    const project = config.projectTypes.find(p => p.id === projectType)
    setBookingData(prev => ({ ...prev, projectType }))
    addUserMessage(`${project.emoji} ${project.label}`)

    const recommendedSize = project.recommendedSize
    if (recommendedSize) {
      const dumpster = config.dumpsters.find(d => d.id === recommendedSize)
      setBookingData(prev => ({ ...prev, size: recommendedSize }))
      await addBotMessage(
        `For a ${project.label.toLowerCase()} project, I recommend the ${dumpster.name}.\n\n${dumpster.dimensions?.display || ''} - ${dumpster.weightIncluded} included\n\nStarting at $${dumpster.pricing['10-day']} for 10 days.\n\nDoes that work, or want a different size?`,
        700
      )
    } else {
      await addBotMessage(`Got it! Which dumpster size do you need?`, 500)
    }
    setStep(STEPS.SIZE_CONFIRM)
  }

  if (isTyping || step !== STEPS.PROJECT_TYPE || messages.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <p className="text-dark-400 text-sm">What kind of project?</p>
      <div className="grid grid-cols-2 gap-2">
        {config.projectTypes.map((project) => {
          const Icon = projectIcons[project.id]
          return (
            <button
              key={project.id}
              onClick={() => handleProjectType(project.id)}
              className="bg-dark-700 hover:bg-dark-600 active:bg-dark-500 rounded-xl p-3 flex items-center gap-3 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary-400" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-white text-sm">{project.label}</p>
                <p className="text-xs text-dark-400 truncate">{project.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
