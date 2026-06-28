<?php
/**
 * Fate Video — SMTP Socket 发信层
 * 使用 Gmail SMTP 授权码发信，免第三方依赖，拉取即用
 */

/**
 * 发送验证码邮件
 *
 * @param string $to       接收方邮箱
 * @param string $subject  邮件标题
 * @param string $body     邮件 HTML 格式内容
 *
 * @return bool|string     成功返回 true，失败返回错误说明字符串
 */
function cms_send_mail($to, $subject, $body)
{
    $smtp_host = 'smtp.gmail.com';
    $smtp_port = 465;
    $username  = 'fatexhs@gmail.com';
    $password  = 'crsx bmwr vxlm zvnv'; // 授权码

    // 构建标准 RFC 822 邮件头与邮件体
    $headers = array(
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        'From: "Fate Video" <' . $username . '>',
        'To: <' . $to . '>',
        'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        'Date: ' . date('r'),
        'Message-ID: <' . time() . '.' . uniqid() . '@' . $smtp_host . '>',
    );
    $email_data = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.";

    // 建立 SSL 套接字连接
    $socket = @stream_socket_client('ssl://' . $smtp_host . ':' . $smtp_port, $errno, $errstr, 8);
    if (!$socket) {
        return "Socket Connection Failed: " . $errstr . " ($errno)";
    }

    // 循环读取多行初次问候
    while ($line = fgets($socket, 512)) {
        $response = $line;
        if (substr($line, 3, 1) !== '-') {
            break;
        }
    }

    $talk = function($cmd) use ($socket, &$last_resp) {
        fwrite($socket, $cmd . "\r\n");
        $last_resp = '';
        while ($line = fgets($socket, 512)) {
            $last_resp .= $line;
            if (substr($line, 3, 1) !== '-') {
                break;
            }
        }
        return substr($last_resp, 0, 3);
    };

    // SMTP 通信交互握手
    if ($talk("EHLO " . $smtp_host) !== '250') {
        fclose($socket);
        return "EHLO failed: " . $last_resp;
    }

    // AUTH LOGIN 身份校验
    if ($talk("AUTH LOGIN") !== '334') {
        fclose($socket);
        return "AUTH LOGIN init failed: " . $last_resp;
    }

    if ($talk(base64_encode($username)) !== '334') {
        fclose($socket);
        return "AUTH Username failed: " . $last_resp;
    }

    if ($talk(base64_encode($password)) !== '235') {
        fclose($socket);
        return "AUTH Password failed: " . $last_resp;
    }

    // 设置发件人与收件人
    if ($talk("MAIL FROM:<" . $username . ">") !== '250') {
        fclose($socket);
        return "MAIL FROM failed: " . $last_resp;
    }

    if ($talk("RCPT TO:<" . $to . ">") !== '250') {
        fclose($socket);
        return "RCPT TO failed: " . $last_resp;
    }

    // 开始发送数据
    if ($talk("DATA") !== '354') {
        fclose($socket);
        return "DATA init failed: " . $last_resp;
    }

    // 发送完整邮件正文
    fwrite($socket, $email_data . "\r\n");
    $last_resp = fgets($socket, 512);
    $code = substr($last_resp, 0, 3);

    $talk("QUIT");
    fclose($socket);

    if ($code === '250') {
        return true;
    } else {
        return "Send Mail Failed: " . $last_resp;
    }
}
