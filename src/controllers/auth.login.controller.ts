

const loginController = (req:any, res:any) => {
    const scope = "user:email read:user"
    const url = process.env.GITHUB_AUTH_URL+`?client_id=${process.env.GITHUB_CLIENT_ID}&scope=${scope}`;
    res.redirect(url);
}

export default loginController;