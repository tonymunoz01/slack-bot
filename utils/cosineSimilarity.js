module.exports = function cosineSimilarity(vecA, vecB) {
	if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
	  //console.warn("⚠️ Invalid vectors for cosine similarity");
	  return -1; // Return worst possible match
	}
  
	const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
	const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
	const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  
	return dot / (magA * magB);
  };
  