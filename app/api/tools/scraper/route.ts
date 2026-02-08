
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// 设置超时时间
export const maxDuration = 60; // 60秒 (Vercel 等平台限制)

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, dataTypes } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 1. 简单的 URL 验证
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // 2. 获取 HTML 内容
    // 模拟浏览器 User-Agent，避免部分网站直接 403
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    };

    let html = '';
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
      }
      html = await response.text();
    } catch (error: any) {
      return NextResponse.json({ error: `Fetch error: ${error.message}` }, { status: 500 });
    }

    // 3. 解析 HTML
    const $ = cheerio.load(html);
    const results: any[] = [];
    
    // 提取页面的文本内容，用于正则匹配
    const bodyText = $('body').text();

    // 4. 根据 dataTypes 提取数据
    
    // --> Email
    if (dataTypes.includes('email')) {
      // 简单的邮箱正则 (实际使用可能需要更复杂的)
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = bodyText.match(emailRegex) || [];
      // 去重
      const uniqueEmails = [...new Set(emails)];
      
      uniqueEmails.forEach(email => {
        results.push({
          type: 'email',
          value: email,
          source: url,
          confidence: 90
        });
      });
      
      // 也可以尝试从 mailto: 链接提取
      $('a[href^="mailto:"]').each((_, elem) => {
        const href = $(elem).attr('href') || '';
        const email = href.replace('mailto:', '').split('?')[0]; // 去掉 ?subject=...
        if (email && !uniqueEmails.includes(email)) {
             results.push({
                type: 'email',
                value: email,
                source: url,
                confidence: 99
             });
             uniqueEmails.push(email);
        }
      });
    }

    // --> Phone
    if (dataTypes.includes('phone')) {
      // 非常宽泛的电话正则，会有误报
      const phoneRegex = /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g;
      const phones = bodyText.match(phoneRegex) || [];
      const uniquePhones = [...new Set(phones)];

       uniquePhones.forEach(phone => {
        results.push({
          type: 'phone',
          value: phone.trim(),
          source: url,
          confidence: 70
        });
      });
      
      // 尝试 tel: 链接
      $('a[href^="tel:"]').each((_, elem) => {
          const href = $(elem).attr('href') || '';
          const phone = href.replace('tel:', '');
           if (phone) {
             results.push({
                type: 'phone',
                value: phone,
                source: url,
                confidence: 99
             });
           }
      });
    }

    // --> Links
    if (dataTypes.includes('links')) {
        $('a[href]').each((_, elem) => {
            let href = $(elem).attr('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                try {
                    // 处理相对路径
                    const absoluteUrl = new URL(href, url).href;
                    results.push({
                        type: 'links',
                        value: absoluteUrl,
                        source: url,
                        confidence: 100
                    });
                } catch (e) {
                    // Ignore invalid urls
                }
            }
        });
    }

    // --> Images (可选，如果用户选择了提取资源)
    // 假设 dataTypes 里有个自定义的 'images' 或者合并进 'links'? 
    // 根据原前端代码，好像没有明确的 images 类型，只有 'links'，这里我们不额外添加除非用户需求。
    
    // --> Names / Companies (NLP 很难做准确，这里用简单的元数据代替)
    if (dataTypes.includes('names') || dataTypes.includes('companies')) {
        // 尝试获取 Title, Meta Description, OG:Site_Name
        const title = $('title').text().trim();
        if (title) {
            results.push({ type: 'names', value: title, source: url, confidence: 50 }); // 假设标题可能包含公司名
        }
        
        const siteName = $('meta[property="og:site_name"]').attr('content');
        if (siteName) {
            results.push({ type: 'companies', value: siteName, source: url, confidence: 80 });
        }
        
        // 尝试从 footer 的 copyright 提取公司名
        const copyright = $('footer').text().match(/©\s*(\d{4})?\s*([^,|.|\n]+)/);
        if (copyright && copyright[2]) {
             results.push({ type: 'companies', value: copyright[2].trim(), source: url, confidence: 75 });
        }
    }

    // Limit results to avoid backend overload logic (optional)
    const limitedResults = results.slice(0, 200);

    return NextResponse.json({ success: true, count: limitedResults.length, data: limitedResults });

  } catch (error: any) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
