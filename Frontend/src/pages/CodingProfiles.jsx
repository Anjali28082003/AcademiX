import { useState, useCallback } from "react";

import { fetchLeetCode, fetchGitHub, fetchCodeforces } from "../api";
// … your logo imports
import Leet from "../assets/Leet.png";
import Gitlogo from"../assets/Gitlogo.jpeg";
import Code from "../assets/Code.png";

const CodingProfiles = () => {
  const [leetData, setLeetData]             = useState(null);
  const [githubData, setGithubData]         = useState(null);
  const [codeforcesData, setCodeforcesData] = useState(null);
  const [loading, setLoading]               = useState({});   // keeps track of fetches

  const [usernames, setUsernames] = useState({
    LeetCode:   "",
    GitHub:     "",
    Codeforces: "",
  });
    
  /** fetch on demand, per‑platform ------------------------------------- */
  const handleFetch = useCallback(async platform => {
    const username = usernames[platform];
    if (!username) return;

    setLoading(prev => ({ ...prev, [platform]: true }));

    try {
      if (platform === "LeetCode") {
        const { data} = await fetchLeetCode(username);
        console.log("RAW response ➜", data);
        setLeetData(data.message);
      } else if (platform === "GitHub") {
        const { data } = await fetchGitHub(username);
        setGithubData(data.message);
      } else if (platform === "Codeforces") {
        const { data } = await fetchCodeforces(username);
        setCodeforcesData(data.message);
      }
    } catch (err) {
      console.error(err);
      // optional: surface “username not found” or auth error here
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  }, [usernames]);

  /** helper so each input only changes its own value ------------------- */
  const updateName = (platform, value) =>
    setUsernames(prev => ({ ...prev, [platform]: value }));

  /** ------------------------------------------------------------------- */
  return (
    <div className="p-6 min-h-screen">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Coding Profiles</h2>

      <div className="bg-white p-6 rounded-xl shadow-md mb-10">
        <div className="flex justify-center gap-6">
          {[
            { img: Leet, name: "LeetCode" },
            { img: Gitlogo, name: "GitHub" },
            { img: Code, name: "Codeforces" },
          ].map(p => (
            <div
              key={p.name}
              className="bg-[#202060] text-white rounded-xl p-4 w-52 text-center shadow-lg"
            >
              {/* logo */}
              <img
                src={p.img}
                alt={p.name}
                className="w-20 h-20 mx-auto mb-4 object-contain"
              />

              {/* username input */}
              <input
                type="text"
                placeholder="Enter your username"
                value={usernames[p.name]}
                onChange={e => updateName(p.name, e.target.value)}
                onBlur={() => handleFetch(p.name)}          // auto‑fetch on blur
                onKeyDown={e => e.key === "Enter" && e.target.blur()}
                className="mt-1 mb-4 w-full rounded-lg px-3 py-2 text-sm text-white
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />

              {/* stats or spinner */}
              {loading[p.name] ? (
                <p className="text-sm italic">Loading…</p>
              ) : p.name === "LeetCode" ? (
                <div className="text-sm space-y-1">
                  <p>Questions Solved: {leetData?.totalSolved ?? "—"}</p>
                 <p>Ranking: {leetData ? Math.floor(leetData.ranking) : "—"}</p>

                </div>
              ) : p.name === "GitHub" ? (
                <div className="text-sm space-y-1">
                  <p>Public Repos: {githubData?.public_repos ?? "—"}</p>
                  <p>Total Commits: {githubData?.commits ?? "—"}</p>
                  <p>Followers: {githubData?.followers ?? "—"}</p>
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  <p>Rating: {codeforcesData?.rating ?? "—"}</p>
                  <p>Max Rating: {codeforcesData?.maxRating ?? "—"}</p>
                  <p>Rank: {codeforcesData?.rank ?? "—"}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* leaderboard + rest of the page unchanged */}
      <div className="text-gray-800 italic mb-2 text-center">
        Leaderboard unlocked! Are you #1? 🔥
      </div>

      <div className="grid grid-cols-2 gap-10">
        {/* LeetCode Leaderboard */}
        <div>
          <h3 className="font-bold text-lg text-gray-700 mb-2">LeetCode</h3>
          <div className="space-y-3">
            {[...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className={`flex items-center bg-[#D9EFFF] rounded-full px-4 py-2 shadow-sm`}
              >
                <span className="text-gray-600 font-bold mr-3">{idx + 1}.</span>
                <div className="w-6 h-6 bg-[#1D4ED8] rounded-full mr-3" />
                <span className="text-gray-700">User Name</span>
              </div>
            ))}
          </div>
        </div>

        {/* CodeForces Leaderboard */}
        <div>
          <h3 className="font-bold text-lg text-gray-700 mb-2">CodeForces</h3>
          <div className="space-y-3">
            {[...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className={`h-10 bg-[#D9EFFF] rounded-full px-4 py-2 flex items-center shadow-sm`}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingProfiles;
