

const gameHistoryController = (req:any, res:any) => {
    const user = req.user; // Assuming the user information is stored in req.user by the authentication middleware

    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Here you would typically fetch the game history from your database based on the user's ID
    // For demonstration purposes, we'll return a static response

    const gameHistory = [
        { gameId: 1, score: 100, date: '2024-01-01' },
        { gameId: 2, score: 150, date: '2024-02-01' },
        { gameId: 3, score: 200, date: '2024-03-01' },
    ];

    res.status(200).json({ userId: user.id, gameHistory });
}

export default gameHistoryController;