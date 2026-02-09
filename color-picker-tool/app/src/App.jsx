import { useState } from 'react'
import './App.css'

function App() {
  const [color, setColor] = useState('#3B82F6')
  const [copied, setCopied] = useState(false)

  const handleColorChange = (e) => {
    setColor(e.target.value.toUpperCase())
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(color).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Color Picker</h1>
          <p className="text-gray-400">Select a color and copy its hex code</p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Color Preview */}
          <div 
            className="w-full h-48 rounded-xl shadow-lg transition-all duration-300 border-4 border-gray-700"
            style={{ backgroundColor: color }}
          />

          {/* Color Picker Input */}
          <div className="flex items-center justify-center">
            <input
              type="color"
              value={color}
              onChange={handleColorChange}
              className="w-24 h-24 cursor-pointer rounded-lg border-4 border-gray-700 bg-gray-900"
            />
          </div>

          {/* Hex Code Display */}
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">HEX CODE</p>
            <p className="text-3xl font-mono font-bold text-white tracking-wider">
              {color}
            </p>
          </div>

          {/* Copy Button */}
          <button
            onClick={copyToClipboard}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-300 ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>Built with React + Tailwind CSS</p>
        </div>
      </div>
    </div>
  )
}

export default App
