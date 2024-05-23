const response = (res, statusCode = 200, success = false, message = '', data = {}, contacts) => {
    res.status(statusCode)
    res.json({
        success,
        message,
        data,
        contacts
    })

    res.end()
}

export default response
