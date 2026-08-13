export default function ATSResults({ result }) {

  if (!result) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-8">

      <h2 className="text-2xl font-bold text-center mb-8">
        ATS Dashboard
      </h2>

      {/* Score Cards */}
      <div className="grid md:grid-cols-2 gap-6">

        <div className="bg-green-100 rounded-xl p-6 text-center">
          <h3 className="font-semibold text-lg">
            ATS Score
          </h3>

          <p className="text-5xl font-bold text-green-700 mt-4">
            {result.ats_score}%
          </p>
        </div>

        <div className="bg-blue-100 rounded-xl p-6 text-center">
          <h3 className="font-semibold text-lg">
            Match %
          </h3>

          <p className="text-5xl font-bold text-blue-700 mt-4">
            {result.match_percentage}%
          </p>
        </div>

      </div>

      {/* Skills */}
      <div className="grid md:grid-cols-2 gap-8 mt-8">

        <div>

          <h3 className="font-bold text-green-700 mb-4">
            ✅ Matched Skills
          </h3>

          {result.matched_skills.map(skill => (
            <div
              key={skill}
              className="bg-green-100 rounded p-3 mb-2"
            >
              {skill}
            </div>
          ))}

        </div>

        <div>

          <h3 className="font-bold text-red-700 mb-4">
            ❌ Missing Skills
          </h3>

          {result.missing_skills.map(skill => (
            <div
              key={skill}
              className="bg-red-100 rounded p-3 mb-2"
            >
              {skill}
            </div>
          ))}

        </div>

      </div>

      {/* Strengths */}
      <div className="mt-8">

        <h3 className="font-bold text-lg mb-4">
          💪 Resume Strengths
        </h3>

        {result.strengths.map(item => (
          <div
            key={item}
            className="bg-green-50 rounded p-3 mb-2"
          >
            ✔ {item}
          </div>
        ))}

      </div>

      {/* Suggestions */}
      <div className="mt-8">

        <h3 className="font-bold text-lg mb-4">
          💡 Suggestions
        </h3>

        {result.suggestions.map(item => (
          <div
            key={item}
            className="bg-yellow-50 rounded p-3 mb-2"
          >
            {item}
          </div>
        ))}

      </div>

      {/* Career Paths */}
      <div className="mt-8">
        <h3 className="font-bold text-lg mb-4">🎯 Recommended Career Paths</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {result.career_paths && result.career_paths.map(path => (
            <div key={path} className="bg-purple-50 rounded p-3">{path}</div>
          ))}
        </div>
      </div>

      {/* Learning Resources */}
      <div className="mt-8">
        <h3 className="font-bold text-lg mb-4">📚 Suggested Learning Resources</h3>
        {result.learning_resources && result.learning_resources.map(res => (
          <div key={res} className="bg-amber-50 rounded p-3 mb-2">{res}</div>
        ))}
      </div>

    </div>
  );
}