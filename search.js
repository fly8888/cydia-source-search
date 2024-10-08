const axios = require('axios');
const fs = require('fs'); // 使用fs.promises来获取promisified版本的fs模块
const fsp = require('fs').promises
const decompress = require('decompress');
const decompressBzip2 = require('decompress-bzip2');
const path = require('path');



function createDirectoryIfNotExists(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}
async function downloadFile(source, directory, fileName) {
    
    // 确保文件名中不包含路径信息，只包含文件名
    const fullPath = path.join(directory, fileName);
    createDirectoryIfNotExists(directory);
    const response = await axios.get(source + fileName, {
        responseType: 'stream'
    });

    const writeStream = fs.createWriteStream(fullPath); // 使用完整的文件路径
    response.data.pipe(writeStream);

    return new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
}

async function decompressFile(inputFileName, outputDirectoryName) {
    await decompress(inputFileName, outputDirectoryName, {
        plugins: [decompressBzip2({ path: inputFileName.replace('.bz2', '') })]
    });
}
async function changeFilePermissions(filePath, mode) {
    try {
        await fs.promises.chmod(filePath, mode);
        console.log('文件权限已更改');
    } catch (error) {
        console.error('修改文件权限时出错:', error);
    }
}
async function getPackages(source,debName) {

    if(source[source.length -1] != '/') 
    {
        source += '/';
    }

    try {
        const tmpDir = './tmp/';
        const packageTypes = ['Packages.bz2','Packages','Packages.xz','Packages.lzma','Packages.gz'];
        var packageType = '';
        for(var i = 0; i < packageTypes.length; i++) {
            try {
                // 下载文件
                await downloadFile(source, tmpDir, packageTypes[i]);
                console.log('文件下载完成');
                packageType = packageTypes[i];
                break; // 找到匹配的文件并跳出循环
            }
            catch (error) {
                console.error('文件类型 ' + packageTypes[i] + ' 文件下载失败\n');
            }
        }
    
        if(packageType.length==0)
        {
            console.error('------------下载文件失败了------------------');
            return;
        }

        if(packageType != 'Packages')
        {
            // 解压文件
            await decompressFile( tmpDir + packageType, './');
            console.log('文件解压完成');
        }


        changeFilePermissions( tmpDir + 'Packages', 0o755); // 设置为755权限（读取、写入、执行权限）
        // 读取解压后的文件内容并输出
        const outputFilePath = tmpDir + 'Packages';
        const fileContent = await fsp.readFile(outputFilePath, 'utf-8');
        console.log('解压后的文件内容：', fileContent);

        const regex = /Package([\s\S]*?)((?=Package:|$))/gs;
        const input = fileContent;
        let match;
        while ((match = regex.exec(input)) !== null) {
            if(match[0].includes(debName))
            {
                console.log('deb pkg info------>\n\n'+match[0]); // 输出整个匹配的代码块
                const regex2 = /(?<=Filename: )\S+/gs;
                const input2 = match[0];
                let match2;
                while ((match2 = regex2.exec(input2)) !== null) {
                    console.log('download url:\n'+ source+match2[0]); 
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
}


const source = 'http://cokepokes.github.io/';
const debName = 'techsupport';

getPackages(source,debName);